export enum VerificationStatus {
    UNVERIFIED = 'UNVERIFIED',  // User hasn't submitted verification documents
    PENDING = 'PENDING',         // Verification request submitted, waiting for review
    VERIFIED = 'VERIFIED',       // Verified by admin
    REJECTED = 'REJECTED',       // Verification was rejected
}
