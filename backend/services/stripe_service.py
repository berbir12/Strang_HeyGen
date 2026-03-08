"""Stripe integration: checkout sessions, customer portal, and webhook handling."""

import logging

import stripe
from fastapi import HTTPException

import config
from storage.database import (
    get_user,
    get_user_by_stripe_customer,
    update_user,
)

logger = logging.getLogger("strang.stripe")


def _ensure_stripe() -> None:
    if not config.STRIPE_SECRET_KEY:
        raise HTTPException(status_code=503, detail="Stripe is not configured.")
    stripe.api_key = config.STRIPE_SECRET_KEY


async def create_checkout_session(user_id: str, email: str) -> str:
    """Create a Stripe Checkout Session. Returns the session URL."""
    _ensure_stripe()

    user = await get_user(user_id)
    customer_id = user.get("stripe_customer_id") if user else None

    params: dict = {
        "mode": "subscription",
        "line_items": [{"price": config.STRIPE_PRICE_ID, "quantity": 1}],
        "success_url": f"{config.LANDING_PAGE_URL}/dashboard?session_id={{CHECKOUT_SESSION_ID}}",
        "cancel_url": f"{config.LANDING_PAGE_URL}/dashboard",
        "metadata": {"user_id": user_id},
    }

    if customer_id:
        params["customer"] = customer_id
    else:
        params["customer_email"] = email

    session = stripe.checkout.Session.create(**params)
    return session.url  # type: ignore[return-value]


async def create_portal_session(user_id: str) -> str:
    """Create a Stripe Customer Portal session so user can manage subscription."""
    _ensure_stripe()

    user = await get_user(user_id)
    if not user or not user.get("stripe_customer_id"):
        raise HTTPException(status_code=400, detail="No active subscription found.")

    session = stripe.billing_portal.Session.create(
        customer=user["stripe_customer_id"],
        return_url=f"{config.LANDING_PAGE_URL}/dashboard",
    )
    return session.url  # type: ignore[return-value]


async def handle_webhook_event(payload: bytes, sig_header: str) -> None:
    """Verify and process a Stripe webhook event."""
    _ensure_stripe()

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, config.STRIPE_WEBHOOK_SECRET,
        )
    except stripe.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid webhook signature.")

    event_type = event["type"]
    data = event["data"]["object"]
    logger.info("Stripe event: %s", event_type)

    if event_type == "checkout.session.completed":
        await _handle_checkout_completed(data)
    elif event_type in (
        "customer.subscription.updated",
        "customer.subscription.deleted",
    ):
        await _handle_subscription_change(data)


async def _handle_checkout_completed(session: dict) -> None:
    user_id = session.get("metadata", {}).get("user_id")
    customer_id = session.get("customer")
    subscription_id = session.get("subscription")

    if not user_id:
        logger.warning("Checkout session missing user_id metadata")
        return

    await update_user(
        user_id,
        stripe_customer_id=customer_id,
        subscription_id=subscription_id,
        subscription_status="active",
        plan="pro",
        videos_limit=999999,
    )
    logger.info("User %s subscribed (customer=%s)", user_id, customer_id)


async def _handle_subscription_change(subscription: dict) -> None:
    customer_id = subscription.get("customer")
    status = subscription.get("status", "")
    period_end = subscription.get("current_period_end")

    user = await get_user_by_stripe_customer(customer_id) if customer_id else None
    if not user:
        logger.warning("Subscription event for unknown customer %s", customer_id)
        return

    is_active = status in ("active", "trialing")
    await update_user(
        user["id"],
        subscription_status=status,
        plan="pro" if is_active else "free",
        videos_limit=999999 if is_active else config.FREE_TIER_VIDEO_LIMIT,
        current_period_end=period_end,
    )
    logger.info("User %s subscription → %s", user["id"], status)
