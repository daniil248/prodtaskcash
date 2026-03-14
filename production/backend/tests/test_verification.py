import pytest
from unittest.mock import AsyncMock, patch
from app.services.verification import _normalize_channel_id, check_subscription


def test_normalize_channel_id():
    assert _normalize_channel_id("@mychannel") == "@mychannel"
    assert _normalize_channel_id("mychannel") == "@mychannel"
    assert _normalize_channel_id("https://t.me/mychannel") == "@mychannel"
    assert _normalize_channel_id("https://t.me/durov") == "@durov"
    assert _normalize_channel_id("-1001234567890") == "-1001234567890"
    assert _normalize_channel_id("  @foo  ") == "@foo"
    assert _normalize_channel_id("") == ""
    assert _normalize_channel_id("   ") == ""


def _resp(json_val):
    return type("R", (), {"json": lambda: json_val})()


@pytest.mark.asyncio
async def test_check_subscription_ok():
    with patch("app.services.verification.httpx.AsyncClient") as MockAC:
        client = AsyncMock()
        client.get = AsyncMock(return_value=_resp({"ok": True, "result": {"status": "member"}}))
        MockAC.return_value.__aenter__.return_value = client
        ok, msg = await check_subscription(12345, "@channel")
        assert ok is True
        assert "подтверждена" in msg


@pytest.mark.asyncio
async def test_check_subscription_not_member():
    with patch("app.services.verification.httpx.AsyncClient") as MockAC:
        client = AsyncMock()
        client.get = AsyncMock(return_value=_resp({"ok": True, "result": {"status": "left"}}))
        MockAC.return_value.__aenter__.return_value = client
        ok, msg = await check_subscription(12345, "@channel")
        assert ok is False
        assert "не подписаны" in msg


@pytest.mark.asyncio
async def test_check_subscription_chat_not_found():
    with patch("app.services.verification.httpx.AsyncClient") as MockAC:
        client = AsyncMock()
        client.get = AsyncMock(return_value=_resp({"ok": False, "description": "Bad Request: chat not found"}))
        MockAC.return_value.__aenter__.return_value = client
        ok, msg = await check_subscription(12345, "@channel")
        assert ok is False
        assert "Бот не добавлен" in msg
