# OAuth Design Note for MCP Server

This note outlines the authorization architecture for the remote HTTP transport of the MCP Server.

## 1. Authorization Server
We will **NOT** hand-roll an authorization server. The Next.js web application (Milestones 9 & 10) or an external Identity Provider (Auth0/Supabase) will act as the OAuth 2.0 Authorization Server. The MCP Server itself acts exclusively as the **Resource Server**. 
For the immediate purpose of M5, we will validate tokens passed in the `Authorization: Bearer <token>` header on the streamable HTTP transport.

## 2. Token Validation & Audience Binding
- Tokens must be standard JWTs.
- The MCP server will validate the signature using a configured public JWKS (JSON Web Key Set).
- **Audience Binding**: The token's `aud` (audience) claim MUST explicitly match the MCP server's configured audience (e.g., `urn:continuum:mcp-api`). This prevents tokens issued for the web frontend from being replayed against the MCP server.

## 3. PKCE and Flow
- Remote AI clients will use the OAuth 2.0 Authorization Code flow with PKCE to obtain tokens from the external Identity Provider.
- **Redirect URI Validation**: The Authorization Server strictly validates redirect URIs registered for the specific client (e.g., `http://localhost/callback` for a local CLI, or specific IDE URI schemes). The MCP Server doesn't handle the redirect directly but relies on the Auth Server ensuring PKCE and redirect validation during issuance.

## 4. Expiry, Refresh, and Revocation
- **Expiry**: Access tokens must be short-lived (e.g., 15-60 minutes), checked via the `exp` claim on every request.
- **Refresh**: Clients use long-lived refresh tokens against the Authorization Server to get new access tokens. The MCP server does not see or handle refresh tokens.
- **Revocation**: A user can revoke a Connection in the Continuum web app. We will maintain a synchronized blocklist (or check a fast database cache table `revoked_tokens`/`disabled_connections`) in the MCP server to invalidate active tokens immediately upon revocation.

## 5. Identity and Connection Mapping (from M2)
- The validated JWT payload will contain a `sub` (subject) representing the Continuum user `Identity`.
- It will also contain a custom claim (e.g., `client_id` or `https://continuum.app/connection_id`) that uniquely identifies the AI Agent or `Connection` making the request.
- The MCP HTTP middleware extracts these and injects `identityId` and `connectionId` into the request context.
- The local `stdio` transport, conversely, will be passed the `connectionId` securely via environment variables or startup arguments by the trusted host CLI, bypassing the OAuth check but directly injecting the trusted context.

## 6. Policy Enforcement
- Tools (`memory.search`, `memory.propose`, etc.) pull the `connectionId` from the request context and pass it to the M2 `PolicyEnforcer`.
- The `PolicyEnforcer` asserts that the Connection is active, the Identity hasn't disabled it, and that the requested workspace operations fall within the granted permission scopes (e.g., `memory:read`, `memory:write`).
