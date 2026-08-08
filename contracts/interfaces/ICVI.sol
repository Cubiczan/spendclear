// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ICVI — Cleanverse Verified Identity
/// @notice Interface for identity tokens bound to wallets of verified users.
///         Bank-verified identity proofs, local-only PII, revocable credentials.
interface ICVI {
    /// @notice Check if a wallet holds a valid (non-revoked) CVI identity token.
    /// @param wallet The address to check.
    /// @return verified True if the wallet has an active CVI credential.
    function hasIdentity(address wallet) external view returns (bool verified);

    /// @notice Get the identity level (e.g. individual, business, accredited investor).
    /// @param wallet The address to query.
    /// @return level The verification level as a uint8 enum.
    function identityLevel(address wallet) external view returns (uint8 level);

    /// @notice Check whether an identity credential has been revoked.
    /// @param wallet The address to check.
    /// @return revoked True if the credential was revoked.
    function isRevoked(address wallet) external view returns (bool revoked);
}
