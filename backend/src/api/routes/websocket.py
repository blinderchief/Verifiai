"""WebSocket endpoints for real-time updates"""

import asyncio
import json
from datetime import datetime
from typing import Optional
from uuid import UUID

import structlog
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_session
from src.core.redis import get_redis
from src.api.dependencies import verify_ws_token
from src.models.user import User

logger = structlog.get_logger()
router = APIRouter()


class ConnectionManager:
    """Manage WebSocket connections for real-time updates"""
    
    def __init__(self):
        # user_id -> list of WebSocket connections
        self.active_connections: dict[str, list[WebSocket]] = {}
        # subscription topics: topic -> set of user_ids
        self.subscriptions: dict[str, set[str]] = {}
    
    async def connect(self, websocket: WebSocket, user_id: str):
        """Accept and register a new WebSocket connection"""
        await websocket.accept()
        
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        
        self.active_connections[user_id].append(websocket)
        
        logger.info("websocket_connected", user_id=user_id, total_connections=len(self.active_connections))
    
    def disconnect(self, websocket: WebSocket, user_id: str):
        """Remove a WebSocket connection"""
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
        
        # Remove from all subscriptions
        for topic in self.subscriptions:
            self.subscriptions[topic].discard(user_id)
        
        logger.info("websocket_disconnected", user_id=user_id)
    
    def subscribe(self, user_id: str, topic: str):
        """Subscribe user to a topic"""
        if topic not in self.subscriptions:
            self.subscriptions[topic] = set()
        self.subscriptions[topic].add(user_id)
        logger.debug("user_subscribed", user_id=user_id, topic=topic)
    
    def unsubscribe(self, user_id: str, topic: str):
        """Unsubscribe user from a topic"""
        if topic in self.subscriptions:
            self.subscriptions[topic].discard(user_id)
    
    async def send_personal(self, user_id: str, message: dict):
        """Send message to a specific user"""
        if user_id in self.active_connections:
            message_json = json.dumps(message)
            for ws in self.active_connections[user_id]:
                try:
                    await ws.send_text(message_json)
                except Exception as e:
                    logger.error("websocket_send_error", error=str(e), user_id=user_id)
    
    async def broadcast_to_topic(self, topic: str, message: dict):
        """Broadcast message to all subscribers of a topic"""
        if topic not in self.subscriptions:
            return
        
        message_json = json.dumps(message)
        for user_id in self.subscriptions[topic]:
            if user_id in self.active_connections:
                for ws in self.active_connections[user_id]:
                    try:
                        await ws.send_text(message_json)
                    except Exception as e:
                        logger.error("websocket_broadcast_error", error=str(e), user_id=user_id, topic=topic)
    
    async def broadcast_all(self, message: dict):
        """Broadcast message to all connected users"""
        message_json = json.dumps(message)
        for user_id, connections in self.active_connections.items():
            for ws in connections:
                try:
                    await ws.send_text(message_json)
                except Exception as e:
                    logger.error("websocket_broadcast_all_error", error=str(e), user_id=user_id)


# Global connection manager
manager = ConnectionManager()


# ============================================================================
# Event Publishers (called by other parts of the application)
# ============================================================================

async def publish_proof_update(user_id: str, proof_id: str, status: str, data: dict = None):
    """Publish proof status update to user"""
    message = {
        "type": "proof_update",
        "timestamp": datetime.utcnow().isoformat(),
        "data": {
            "proof_id": proof_id,
            "status": status,
            **(data or {}),
        },
    }
    await manager.send_personal(user_id, message)


async def publish_agent_update(user_id: str, agent_id: str, status: str, data: dict = None):
    """Publish agent status update to user"""
    message = {
        "type": "agent_update",
        "timestamp": datetime.utcnow().isoformat(),
        "data": {
            "agent_id": agent_id,
            "status": status,
            **(data or {}),
        },
    }
    await manager.send_personal(user_id, message)


async def publish_settlement_update(user_id: str, settlement_id: str, status: str, data: dict = None):
    """Publish settlement status update to user"""
    message = {
        "type": "settlement_update",
        "timestamp": datetime.utcnow().isoformat(),
        "data": {
            "settlement_id": settlement_id,
            "status": status,
            **(data or {}),
        },
    }
    await manager.send_personal(user_id, message)


async def publish_reward_notification(user_id: str, amount: int, reason: str):
    """Publish reward notification to user"""
    message = {
        "type": "reward_notification",
        "timestamp": datetime.utcnow().isoformat(),
        "data": {
            "amount": amount,
            "reason": reason,
        },
    }
    await manager.send_personal(user_id, message)


async def publish_swarm_update(swarm_id: str, event_type: str, data: dict = None):
    """Publish swarm update to all swarm subscribers"""
    message = {
        "type": "swarm_update",
        "timestamp": datetime.utcnow().isoformat(),
        "data": {
            "swarm_id": swarm_id,
            "event": event_type,
            **(data or {}),
        },
    }
    await manager.broadcast_to_topic(f"swarm:{swarm_id}", message)


async def publish_platform_announcement(title: str, message: str, priority: str = "normal"):
    """Broadcast platform-wide announcement"""
    announcement = {
        "type": "announcement",
        "timestamp": datetime.utcnow().isoformat(),
        "data": {
            "title": title,
            "message": message,
            "priority": priority,
        },
    }
    await manager.broadcast_all(announcement)


# ============================================================================
# WebSocket Endpoints
# ============================================================================

@router.websocket("/connect")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(..., description="JWT authentication token"),
):
    """Main WebSocket endpoint for real-time updates
    
    Message protocol:
    - Client sends: { "action": "subscribe" | "unsubscribe" | "ping", "topic": "..." }
    - Server sends: { "type": "...", "timestamp": "...", "data": {...} }
    
    Available topics:
    - proofs: User's proof updates
    - agents: User's agent updates
    - settlements: User's settlement updates
    - swarm:{id}: Specific swarm updates
    - platform: Platform-wide announcements
    """
    
    # Verify token and get user
    user = await verify_ws_token(token)
    if not user:
        await websocket.close(code=4001, reason="Invalid authentication token")
        return
    
    user_id = str(user.id)
    
    await manager.connect(websocket, user_id)
    
    # Auto-subscribe to personal topics
    manager.subscribe(user_id, "proofs")
    manager.subscribe(user_id, "agents")
    manager.subscribe(user_id, "settlements")
    manager.subscribe(user_id, "platform")
    
    # Send welcome message
    await websocket.send_json({
        "type": "connected",
        "timestamp": datetime.utcnow().isoformat(),
        "data": {
            "user_id": user_id,
            "message": "Connected to VerifiAI real-time updates",
            "subscriptions": ["proofs", "agents", "settlements", "platform"],
        },
    })
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_json()
            action = data.get("action")
            
            if action == "ping":
                # Respond to ping
                await websocket.send_json({
                    "type": "pong",
                    "timestamp": datetime.utcnow().isoformat(),
                })
            
            elif action == "subscribe":
                topic = data.get("topic")
                if topic:
                    manager.subscribe(user_id, topic)
                    await websocket.send_json({
                        "type": "subscribed",
                        "timestamp": datetime.utcnow().isoformat(),
                        "data": {"topic": topic},
                    })
            
            elif action == "unsubscribe":
                topic = data.get("topic")
                if topic:
                    manager.unsubscribe(user_id, topic)
                    await websocket.send_json({
                        "type": "unsubscribed",
                        "timestamp": datetime.utcnow().isoformat(),
                        "data": {"topic": topic},
                    })
            
            else:
                await websocket.send_json({
                    "type": "error",
                    "timestamp": datetime.utcnow().isoformat(),
                    "data": {"message": f"Unknown action: {action}"},
                })
    
    except WebSocketDisconnect:
        manager.disconnect(websocket, user_id)
    except Exception as e:
        logger.error("websocket_error", error=str(e), user_id=user_id)
        manager.disconnect(websocket, user_id)


@router.websocket("/proof/{proof_id}")
async def proof_status_websocket(
    websocket: WebSocket,
    proof_id: str,
    token: str = Query(..., description="JWT authentication token"),
):
    """WebSocket endpoint for tracking specific proof generation progress
    
    Sends updates during proof generation:
    - { "type": "proof_progress", "data": { "stage": "...", "progress": 0-100 } }
    - { "type": "proof_complete", "data": { "proof_id": "...", "status": "..." } }
    - { "type": "proof_error", "data": { "error": "..." } }
    """
    
    user = await verify_ws_token(token)
    if not user:
        await websocket.close(code=4001, reason="Invalid authentication token")
        return
    
    user_id = str(user.id)
    
    await manager.connect(websocket, user_id)
    
    # Subscribe to proof-specific updates
    topic = f"proof:{proof_id}"
    manager.subscribe(user_id, topic)
    
    await websocket.send_json({
        "type": "tracking",
        "timestamp": datetime.utcnow().isoformat(),
        "data": {
            "proof_id": proof_id,
            "message": "Tracking proof generation progress",
        },
    })
    
    try:
        while True:
            # Keep connection alive, wait for client pings
            data = await websocket.receive_json()
            if data.get("action") == "ping":
                await websocket.send_json({
                    "type": "pong",
                    "timestamp": datetime.utcnow().isoformat(),
                })
    
    except WebSocketDisconnect:
        manager.unsubscribe(user_id, topic)
        manager.disconnect(websocket, user_id)
    except Exception as e:
        logger.error("proof_websocket_error", error=str(e), proof_id=proof_id)
        manager.disconnect(websocket, user_id)


# ============================================================================
# Redis-based Pub/Sub for distributed WebSocket scaling
# ============================================================================

async def start_redis_listener():
    """Start listening to Redis pub/sub for distributed WebSocket messages
    
    This allows scaling WebSocket servers horizontally - messages published
    to Redis from any server will be broadcast to connected clients.
    """
    try:
        redis = await get_redis()
        if not redis:
            logger.warning("redis_not_available", message="WebSocket scaling disabled")
            return
        
        pubsub = redis.pubsub()
        await pubsub.subscribe("verifiai:ws:broadcast")
        
        logger.info("redis_pubsub_started", channel="verifiai:ws:broadcast")
        
        async for message in pubsub.listen():
            if message["type"] == "message":
                try:
                    data = json.loads(message["data"])
                    target = data.get("target")
                    payload = data.get("payload")
                    
                    if target == "all":
                        await manager.broadcast_all(payload)
                    elif target.startswith("user:"):
                        user_id = target.split(":", 1)[1]
                        await manager.send_personal(user_id, payload)
                    elif target.startswith("topic:"):
                        topic = target.split(":", 1)[1]
                        await manager.broadcast_to_topic(topic, payload)
                
                except Exception as e:
                    logger.error("redis_message_error", error=str(e))
    
    except Exception as e:
        logger.error("redis_listener_error", error=str(e))


async def publish_via_redis(target: str, payload: dict):
    """Publish WebSocket message via Redis for distributed delivery
    
    Args:
        target: "all", "user:{id}", or "topic:{name}"
        payload: Message payload to send
    """
    try:
        redis = await get_redis()
        if redis:
            message = json.dumps({"target": target, "payload": payload})
            await redis.publish("verifiai:ws:broadcast", message)
        else:
            # Fallback to direct delivery if Redis not available
            if target == "all":
                await manager.broadcast_all(payload)
            elif target.startswith("user:"):
                user_id = target.split(":", 1)[1]
                await manager.send_personal(user_id, payload)
            elif target.startswith("topic:"):
                topic = target.split(":", 1)[1]
                await manager.broadcast_to_topic(topic, payload)
    except Exception as e:
        logger.error("redis_publish_error", error=str(e))
