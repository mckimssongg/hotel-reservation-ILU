from datetime import date
from datetime import timedelta
from decimal import Decimal


def calculate_nights(check_in: date, check_out: date) -> int:
    return (check_out - check_in).days


def format_price(amount: Decimal) -> str:
    return f"${amount:.2f}"


def is_weekend(d: date) -> bool:
    return d.weekday() in (4, 5)


def date_range(start: date, end: date):
    current = start
    while current < end:
        yield current
        current += timedelta(days=1)


def validate_date_range(check_in: date, check_out: date, allow_past: bool = False):
    today = date.today()
    if not allow_past and check_in < today:
        return 'check_in no puede ser pasado.'
    if check_out <= check_in:
        return 'check_out tiene que ser mayor que check_in.'
    return None
