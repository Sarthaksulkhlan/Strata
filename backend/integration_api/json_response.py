"""JSON boundary sanitation; analytical values and stored evidence stay untouched."""
import math
from starlette.responses import JSONResponse


def finite_json(value):
    if isinstance(value, float):
        return value if math.isfinite(value) else None
    if isinstance(value, dict):
        return {key: finite_json(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [finite_json(item) for item in value]
    return value


class FiniteJSONResponse(JSONResponse):
    def render(self, content):
        return super().render(finite_json(content))
