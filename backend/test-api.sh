#!/bin/bash

# Script để test API endpoints (dùng cho local development)
# Sử dụng: bash test-api.sh

BASE_URL="http://localhost:3001"
ADMIN_TOKEN="mock_admin_token"
USER_TOKEN="mock_user_token_john"

echo "=========================================="
echo "🧪 Testing EventApp Backend API"
echo "=========================================="
echo ""

# Test 1: Get all events (public)
echo "📋 Test 1: GET /events"
curl -s "$BASE_URL/events" | jq '.'
echo ""
echo ""

# Test 2: Get event by ID (public)
echo "📋 Test 2: GET /events/{id}"
curl -s "$BASE_URL/events/evt_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d" | jq '.'
echo ""
echo ""

# Test 3: Export event to ICS (public)
echo "📅 Test 3: GET /events/{id}/export"
curl -s "$BASE_URL/events/evt_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d/export"
echo ""
echo ""

# Test 4: Create event (Admin only)
echo "➕ Test 4: POST /events (Admin)"
curl -s -X POST "$BASE_URL/events" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Workshop TypeScript Nâng Cao",
    "category": "education",
    "description": "Học TypeScript từ cơ bản đến nâng cao",
    "date": "2026-09-15T14:00:00Z",
    "location": "Online",
    "imageUrl": "https://images.unsplash.com/photo-1516116216624-53e697fedbea",
    "totalSeats": 50
  }' | jq '.'
echo ""
echo ""

# Test 5: Get recommendations (User authenticated)
echo "💡 Test 5: GET /events/recommendations (User)"
curl -s "$BASE_URL/events/recommendations" \
  -H "Authorization: Bearer $USER_TOKEN" | jq '.'
echo ""
echo ""

# Test 6: Register for event (User authenticated)
echo "✅ Test 6: POST /events/{id}/register (User)"
curl -s -X POST "$BASE_URL/events/evt_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d/register" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" | jq '.'
echo ""
echo ""

# Test 7: Get user registrations (User authenticated)
echo "📜 Test 7: GET /users/registrations (User)"
curl -s "$BASE_URL/users/registrations" \
  -H "Authorization: Bearer $USER_TOKEN" | jq '.'
echo ""
echo ""

# Test 8: Join waitlist (User authenticated)
echo "⏳ Test 8: POST /events/{id}/waitlist (User)"
curl -s -X POST "$BASE_URL/events/evt_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d/waitlist" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" | jq '.'
echo ""
echo ""

# Test 9: Check-in (Admin/Organizer only)
echo "🎫 Test 9: POST /events/{id}/checkin (Admin)"
curl -s -X POST "$BASE_URL/events/evt_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d/checkin" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ticketCode": "TKT-AWS-9B1D-8888",
    "manualOverride": false
  }' | jq '.'
echo ""
echo ""

# Test 10: Submit review (User authenticated, must be checked-in)
echo "⭐ Test 10: POST /events/{id}/reviews (User)"
curl -s -X POST "$BASE_URL/events/evt_9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d/reviews" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "rating": 5,
    "comment": "Sự kiện rất tuyệt vời! Tôi đã học được nhiều điều."
  }' | jq '.'
echo ""
echo ""

# Test 11: Search events by category
echo "🔍 Test 11: GET /events?category=technology"
curl -s "$BASE_URL/events?category=technology" | jq '.'
echo ""
echo ""

# Test 12: Search events by keyword
echo "🔍 Test 12: GET /events?search=AWS"
curl -s "$BASE_URL/events?search=AWS" | jq '.'
echo ""
echo ""

echo "=========================================="
echo "✅ Testing completed!"
echo "=========================================="
