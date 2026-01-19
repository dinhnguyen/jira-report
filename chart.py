import os
import argparse
import csv
from collections import defaultdict
from datetime import datetime, date, timedelta
from zoneinfo import ZoneInfo

import requests
import matplotlib.pyplot as plt

TZ = ZoneInfo("Asia/Bangkok")


def parse_jira_dt(s: str) -> datetime:
    s = s.strip()
    if s.endswith("Z"):
        s = s[:-1] + "+0000"
        for fmt in ("%Y-%m-%dT%H:%M:%S.%f%z", "%Y-%m-%dT%H:%M:%S%z"):
            try:
                return datetime.strptime(s, fmt)
            except ValueError:
                pass
    for fmt in ("%Y-%m-%dT%H:%M:%S.%f%z", "%Y-%m-%dT%H:%M:%S%z"):
        try:
            return datetime.strptime(s, fmt)
        except ValueError:
            pass
    if len(s) >= 6 and (s[-6] in ["+", "-"]) and s[-3] == ":":
        s2 = s[:-3] + s[-2:]
        for fmt in ("%Y-%m-%dT%H:%M:%S.%f%z", "%Y-%m-%dT%H:%M:%S%z"):
            try:
                return datetime.strptime(s2, fmt)
            except ValueError:
                pass
    raise ValueError(f"Unsupported datetime format: {s}")


def daterange(d0: date, d1: date):
    d = d0
    while d <= d1:
        yield d
        d += timedelta(days=1)


class JiraClient:
    def __init__(self, base_url: str, email: str, token: str):
        self.base_url = base_url.rstrip("/")
        self.session = requests.Session()
        self.session.auth = (email, token)
        self.session.headers.update({"Accept": "application/json"})

    def get(self, path, params=None):
        r = self.session.get(self.base_url + path, params=params, timeout=60)
        r.raise_for_status()
        return r.json()


def get_sprint_dates(j: JiraClient, sprint_id: int):
    sp = j.get(f"/rest/agile/1.0/sprint/{sprint_id}")
    start = sp.get("startDate")
    end = sp.get("endDate")
    if not start:
        raise RuntimeError("Sprint không có startDate.")
    start_ts = parse_jira_dt(start).astimezone(TZ)
    end_ts = parse_jira_dt(end).astimezone(TZ) if end else datetime.now(TZ)
    return start_ts, end_ts


def get_sprint_issue_keys(j: JiraClient, sprint_id: int):
    keys = []
    start_at = 0
    while True:
        data = j.get(
            f"/rest/agile/1.0/sprint/{sprint_id}/issue",
            {"startAt": start_at, "maxResults": 50},
        )
        issues = data.get("issues", [])
        keys.extend([it["key"] for it in issues])
        total = data.get("total", 0)
        if start_at + len(issues) >= total:
            break
        start_at += len(issues)
    return keys


def iter_changelog(j: JiraClient, issue_key: str):
    start_at = 0
    while True:
        data = j.get(
            f"/rest/api/3/issue/{issue_key}/changelog",
            {"startAt": start_at, "maxResults": 100},
        )
        vals = data.get("values", [])
        for h in vals:
            yield h
        total = data.get("total", 0)
        if start_at + len(vals) >= total:
            break
        start_at += len(vals)


def get_issue_now_estimates(j: JiraClient, issue_key: str):
    data = j.get(
        f"/rest/api/3/issue/{issue_key}",
        {"fields": "timeoriginalestimate,timeestimate"},
    )
    f = data.get("fields", {})
    oe = int(f.get("timeoriginalestimate") or 0)
    re = int(f.get("timeestimate") or 0)
    return oe, re


def reconstruct_estimates_at_start(j: JiraClient, issue_key: str, start_ts: datetime):
    """
    Reconstruct OE0/RE0 at sprint start by reversing all estimate changes AFTER start_ts.
    """
    oe_now, re_now = get_issue_now_estimates(j, issue_key)
    oe0, re0 = oe_now, re_now

    for h in iter_changelog(j, issue_key):
        created = parse_jira_dt(h["created"]).astimezone(TZ)
        if created <= start_ts:
            continue
        for item in h.get("items", []):
            fid = item.get("fieldId") or item.get("field")
            if fid not in ("timeoriginalestimate", "timeestimate"):
                continue
            frm = int(item.get("from") or 0)
            to = int(item.get("to") or 0)
            delta = to - frm
            if fid == "timeoriginalestimate":
                oe0 -= delta
            else:
                re0 -= delta

    return max(0, oe0), max(0, re0)


def get_daily_remaining_deltas(j: JiraClient, issue_keys, start_d: date, end_d: date):
    """
    Sum manual changes of remaining estimate (timeestimate) per day from changelog.
    """
    daily = defaultdict(int)  # date -> delta remaining seconds
    for key in issue_keys:
        for h in iter_changelog(j, key):
            created = parse_jira_dt(h["created"]).astimezone(TZ)
            d = created.date()
            if d < start_d or d > end_d:
                continue
            for item in h.get("items", []):
                fid = item.get("fieldId") or item.get("field")
                if fid != "timeestimate":
                    continue
                frm = int(item.get("from") or 0)
                to = int(item.get("to") or 0)
                daily[d] += (to - frm)
    return daily


def get_daily_spent(j: JiraClient, issue_keys, start_d: date, end_d: date, spent_by: str):
    """
    spent_by:
      - 'started': bucket theo ngày làm việc thực tế (worklog.started)
      - 'created': bucket theo ngày nhập liệu (worklog.created)
    """
    daily = defaultdict(int)
    for key in issue_keys:
        wl = j.get(f"/rest/api/3/issue/{key}/worklog", {"maxResults": 5000})
        for w in wl.get("worklogs", []):
            ts_field = w.get("started") if spent_by == "started" else w.get("created")
            if not ts_field:
                continue
            dt = parse_jira_dt(ts_field).astimezone(TZ)
            d = dt.date()
            if start_d <= d <= end_d:
                daily[d] += int(w.get("timeSpentSeconds") or 0)
    return daily


def seconds_to_hours(x: int) -> float:
    return x / 3600.0


def plot_burndown_burnup(rows, out_png: str, spent_by: str, remaining_mode: str):
    dates = [r["date"] for r in rows]

    remaining_hours = [seconds_to_hours(int(r["remaining_seconds"])) for r in rows]
    cum_spent_hours = [seconds_to_hours(int(r["cumulative_spent_seconds"])) for r in rows]

    # Ideal remaining: linear to zero from day 1 remaining
    if len(remaining_hours) >= 2:
        start_val = float(remaining_hours[0])
        n = len(remaining_hours) - 1
        ideal = [start_val * (1 - i / n) for i in range(len(remaining_hours))]
    else:
        ideal = remaining_hours

    fig, ax1 = plt.subplots()
    ax1.plot(dates, remaining_hours, marker="o", label="Remaining")
    ax1.plot(dates, ideal, label="Ideal remaining")
    ax1.set_xlabel("Date")
    ax1.set_ylabel("Remaining (hours)")
    plt.xticks(rotation=45, ha="right")

    ax2 = ax1.twinx()
    ax2.plot(dates, cum_spent_hours, marker="s", linestyle="--", label="Cumulative spent")
    ax2.set_ylabel("Cumulative spent (hours)")

    # Combine legends
    lines1, labels1 = ax1.get_legend_handles_labels()
    lines2, labels2 = ax2.get_legend_handles_labels()
    ax1.legend(lines1 + lines2, labels1 + labels2, loc="best")

    plt.title(f"Sprint Remaining ↓ / Spent ↑  (spent_by={spent_by}, remaining_mode={remaining_mode})")
    plt.tight_layout()
    plt.savefig(out_png, dpi=160)
    plt.close()


def main():
    # Cắm sẵn theo thông tin bạn đưa (không cắm token)
    DEFAULT_BASE_URL = "https://vinid-team.atlassian.net"
    DEFAULT_EMAIL = "dinhnn@onemount.com"
    DEFAULT_SPRINT_ID = 23286

    ap = argparse.ArgumentParser()
    ap.add_argument("--spent_by", choices=["started", "created"], default="started")
    ap.add_argument("--remaining_mode", choices=["burn_only", "with_reestimate"], default="with_reestimate")
    ap.add_argument("--out_csv", default="daily_sprint_burndown.csv")

    ap.add_argument("--plot", action="store_true", help="Export PNG chart after CSV")
    ap.add_argument("--out_png", default="sprint_burndown_burnup.png")

    # Cho phép override nếu cần
    ap.add_argument("--base_url", default=DEFAULT_BASE_URL)
    ap.add_argument("--email", default=DEFAULT_EMAIL)
    ap.add_argument("--sprint_id", type=int, default=DEFAULT_SPRINT_ID)

    args = ap.parse_args()

    token = os.getenv("JIRA_API_TOKEN")
    if not token:
        raise RuntimeError("Thiếu env JIRA_API_TOKEN. Hãy export token trước khi chạy.")

    j = JiraClient(args.base_url, args.email, token)

    sprint_start_ts, sprint_end_ts = get_sprint_dates(j, args.sprint_id)
    start_d, end_d = sprint_start_ts.date(), sprint_end_ts.date()

    issue_keys = get_sprint_issue_keys(j, args.sprint_id)

    # Baseline at sprint start
    total_oe0 = 0
    total_re0 = 0
    for k in issue_keys:
        oe0, re0 = reconstruct_estimates_at_start(j, k, sprint_start_ts)
        total_oe0 += oe0
        total_re0 += re0

    daily_spent = get_daily_spent(j, issue_keys, start_d, end_d, args.spent_by)
    daily_delta_re = get_daily_remaining_deltas(j, issue_keys, start_d, end_d)

    rows = []
    cum_spent = 0
    cum_delta_re = 0

    for d in daterange(start_d, end_d):
        spent = daily_spent.get(d, 0)
        delta_re = daily_delta_re.get(d, 0)

        cum_spent += spent
        cum_delta_re += delta_re

        remaining_burn = total_re0 - cum_spent
        remaining_calc = total_re0 - cum_spent + cum_delta_re
        remaining = remaining_burn if args.remaining_mode == "burn_only" else remaining_calc

        rows.append({
            "date": d.isoformat(),
            "baseline_total_original_seconds": total_oe0,
            "baseline_total_remaining_seconds": total_re0,
            "spent_seconds": spent,
            "cumulative_spent_seconds": cum_spent,
            "delta_remaining_manual_seconds": delta_re,
            "cumulative_delta_remaining_manual_seconds": cum_delta_re,
            "remaining_seconds": max(0, remaining),
        })

    with open(args.out_csv, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)

    print(f"Done: {args.out_csv}")

    if args.plot:
        plot_burndown_burnup(
            rows=rows,
            out_png=args.out_png,
            spent_by=args.spent_by,
            remaining_mode=args.remaining_mode,
        )
        print(f"Done: {args.out_png}")


if __name__ == "__main__":
    main()