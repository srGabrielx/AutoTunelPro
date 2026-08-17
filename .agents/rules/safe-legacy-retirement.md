# Rule: Safe Legacy Code Retirement (L11 Gate Protocol)

**Context:** When deleting, deprecating, or replacing legacy files, architectural modules, or deeply integrated legacy code.

**Constraint:** Do not treat legacy retirement as a simple "delete files" task. You MUST follow the 10-step safe retirement protocol to guarantee zero regressions.

**The 10-Step Safe Retirement Protocol:**
1. **Map References:** Find all imports and references to the legacy code.
2. **Classify:** Tag each file as `ACTIVE`, `ADAPTER_ONLY`, or `DEAD`.
3. **Migrate:** Migrate or remove any remaining consumers of `ACTIVE` or `ADAPTER_ONLY` code.
4. **Pre-Flight Tests:** Run the full regression test suite (e.g., L0-L10). Ensure 100% PASS.
5. **Pre-Flight Typecheck:** Run a global typecheck (e.g., `tsc --noEmit`). Ensure zero introduced errors.
6. **Golden Seeds:** Confirm Golden Seeds or output identities are pristine.
7. **Verify Isolation:** Confirm `LEGACY_ACTIVE_REFERENCES = 0` and `LEGACY_PRESET_DEPENDENCIES = 0`.
8. **Checkpoint:** Establish a mental or git checkpoint.
9. **Delete:** Remove the legacy code.
10. **Post-Flight Verification:** Run tests, build, and typecheck again. If ANY test breaks or any new type error appears, **IMMEDIATE ROLLBACK**. Do not adapt tests to "accept" the removal without explicit user authorization.

**Complementary Protections:**
- **Rollback Does Not Replace Diagnosis:** If the post-delete verification fails, first identify exactly which dependency was removed prematurely. Then restore the checkpoint. Do not attempt to "hotfix" or patch the new code just to force the deletion to work.
- **Test Integrity:** NEVER alter tests or Golden Seeds to legitimize a removal that changed behavior, unless you have explicit user authorization. A failed test means the legacy code was still needed or the migration was incomplete.
