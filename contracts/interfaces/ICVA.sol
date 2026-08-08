// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title ICVA — Cleanverse Verified Assets
/// @notice Interface for verified stablecoins and assets with clean origination,
///         programmable compliance rules, and full traceability.
interface ICVA {
    /// @notice Check if a token address is a CVA-verified asset.
/// @param token The ERC20 address to check.
/// @return verified True if the token has CVA verification (clean origination).
    function isVerified(address token) external view returns (bool verified);

    /// @notice Get the asset verification metadata.
/// @param token The ERC20 address to query.
/// @return originCountry Country of origination (ISO 3166-1).
/// @return assetClass Classification (stablecoin, RWA token, etc.).
/// @return traceabilityDepth Number of hops with full traceability.
    function assetInfo(address token) external view returns (
        string memory originCountry,
        string memory assetClass,
        uint256 traceabilityDepth
    );

    /// @notice Check if a specific amount of a token is clean (not flagged).
/// @param token The ERC20 address.
/// @param amount The amount to check.
/// @return clean True if this amount passes compliance screening.
    function isClean(address token, uint256 amount) external view returns (bool clean);
}
