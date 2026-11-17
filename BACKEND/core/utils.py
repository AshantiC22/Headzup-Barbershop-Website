from rest_framework.views import exception_handler


def _first_message(data):
    """The first human-readable message in DRF error data, however nested:
    "text", ["text"], {"detail": "text"}, {"time": ["text"]}."""
    if isinstance(data, str):
        return data
    if isinstance(data, (list, tuple)):
        for item in data:
            msg = _first_message(item)
            if msg:
                return msg
        return None
    if isinstance(data, dict):
        if "detail" in data:
            return _first_message(data["detail"])
        for value in data.values():
            msg = _first_message(value)
            if msg:
                return msg
    return None


def custom_exception_handler(exc, context):
    """Every API error comes back as {"error": "<message>", "message": …,
    "status_code": …}, plus "fields" for per-field validation errors.

    "error" is the message itself, the same as views that return
    Response({"error": "…"}) directly, so the frontend reads one key for both.
    It used to be the literal True, and a ValidationError raised with a plain
    string (a list, not a dict) crashed this handler into a 500.
    """
    response = exception_handler(exc, context)
    if response is None:
        return None

    original = response.data
    message = str(_first_message(original) or "Something went wrong.")
    response.data = {"error": message, "message": message, "status_code": response.status_code}
    if isinstance(original, dict) and "detail" not in original:
        response.data["fields"] = original
    return response
