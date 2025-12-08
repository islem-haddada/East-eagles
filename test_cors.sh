#!/bin/bash

echo "Testing CORS preflight request for expiring documents endpoint..."

# Test OPTIONS request (preflight)
curl -X OPTIONS \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type, Authorization" \
  -v http://localhost:8080/api/admin/documents/expiring

echo -e "\n\nTesting actual GET request..."

# Test actual GET request
curl -X GET \
  -H "Origin: http://localhost:3000" \
  -H "Authorization: Bearer test-token" \
  -v http://localhost:8080/api/admin/documents/expiring