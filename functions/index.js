const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

exports.syncUsers = onCall({ cors: true }, async (request) => {
  // Check if any users exist in Firebase Auth to handle bootstrapping
  let bootstrapMode = false;
  try {
    const listUsersResult = await admin.auth().listUsers(1);
    if (listUsersResult.users.length === 0) {
      bootstrapMode = true;
    }
  } catch (err) {
    throw new HttpsError("internal", `Failed to inspect Auth database: ${err.message}`);
  }

  if (!bootstrapMode) {
    // 1. Verify Authentication
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "The function must be called while authenticated.");
    }

    const email = (request.auth.token.email || "").toLowerCase();
    if (!email) {
      throw new HttpsError(
        "unauthenticated",
        "User must be authenticated with a valid email address.",
      );
    }

    // 2. Authorize Caller (must be admin role in Firestore)
    try {
      const usersSnap = await db.collection("users").get();
      const allUsers = usersSnap.docs.map((doc) => doc.data());
      const caller = allUsers.find((u) => {
        if (!u.email) return false;
        if (u.email.toLowerCase() === email) return true;
        // Also check standard name-based email as fallback
        const standard = `${u.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, ".")
          .replace(/^\.+|\.+$/g, "")}@x3corp.net`;
        if (standard === email) return true;
        return false;
      });

      if (!caller || caller.role !== "admin") {
        throw new HttpsError("permission-denied", "Only administrators can run the sync function.");
      }
    } catch (err) {
      if (err instanceof HttpsError) throw err;
      throw new HttpsError("internal", `Failed to authorize caller: ${err.message}`);
    }
  }

  // 3. Process Sync
  const { usersToSync } = request.data;
  if (!Array.isArray(usersToSync)) {
    throw new HttpsError("invalid-argument", "The parameter 'usersToSync' must be an array.");
  }

  const results = {
    created: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  const DEFAULT_DEMO_PASSWORD = "X3Demo!2026";

  for (const u of usersToSync) {
    const targetEmail = (u.email || "").trim();
    if (!targetEmail) {
      results.skipped++;
      continue;
    }

    try {
      let authUser;
      const oldEmail = (u.oldEmail || "").trim();

      // Attempt to look up by previous email first if provided
      if (oldEmail) {
        try {
          authUser = await admin.auth().getUserByEmail(oldEmail);
        } catch (authErr) {
          if (authErr.code !== "auth/user-not-found") throw authErr;
        }
      }

      // If not found by oldEmail, look up by new target email
      if (!authUser) {
        try {
          authUser = await admin.auth().getUserByEmail(targetEmail);
        } catch (authErr) {
          if (authErr.code !== "auth/user-not-found") throw authErr;
        }
      }

      if (!authUser) {
        // Create user in Auth
        await admin.auth().createUser({
          email: targetEmail,
          password: DEFAULT_DEMO_PASSWORD,
          displayName: u.name,
        });
        results.created++;
      } else {
        // Update user in Auth
        const updateParams = {
          password: DEFAULT_DEMO_PASSWORD,
          displayName: u.name,
        };
        // Update email if it changed
        if (authUser.email.toLowerCase() !== targetEmail.toLowerCase()) {
          updateParams.email = targetEmail;
        }
        await admin.auth().updateUser(authUser.uid, updateParams);
        results.updated++;
      }

      // Write profile to Firestore (omit temporary oldEmail field)
      const cleanedUser = {};
      for (const [k, v] of Object.entries(u)) {
        if (k !== "oldEmail" && v !== undefined) cleanedUser[k] = v;
      }
      await db.collection("users").doc(u.id).set(cleanedUser, { merge: true });
    } catch (err) {
      results.errors.push({
        id: u.id,
        email: targetEmail,
        error: err.message,
      });
    }
  }

  return {
    success: results.errors.length === 0,
    summary: `${bootstrapMode ? "[Bootstrap Mode] " : ""}Created: ${results.created}, Updated: ${results.updated}, Skipped: ${results.skipped}, Errors: ${results.errors.length}`,
    errors: results.errors,
  };
});
