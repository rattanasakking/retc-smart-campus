const passport = require('passport');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function signToken(user) {
  return jwt.sign(
    {
      id: user.id, employeeId: user.employeeId, email: user.email,
      name: user.name, role: user.role, isSuperAdmin: user.isSuperAdmin,
      departmentId: user.departmentId, department: user.department,
      divisionId: user.divisionId, workUnitId: user.workUnitId,
      position: user.position,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
}

// Returns { user, status: 'active'|'inactive'|'not_found' }
async function resolveOAuthUser(providerField, providerId, email) {
  let user = await prisma.user.findFirst({ where: { [providerField]: providerId } });
  if (user) return { user, status: user.isActive ? 'active' : 'inactive' };

  if (email) {
    user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (user) {
      if (!user.isActive) return { user: null, status: 'inactive' };
      user = await prisma.user.update({
        where: { id: user.id },
        data: { [providerField]: providerId },
      });
      return { user, status: 'active' };
    }
  }

  return { user: null, status: 'not_found' };
}

// Extract email from LINE id_token (OpenID Connect JWT)
function emailFromIdToken(idToken) {
  if (!idToken) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(idToken.split('.')[1], 'base64url').toString('utf8')
    );
    return payload.email || null;
  } catch {
    return null;
  }
}

// ─── LINE Strategy ────────────────────────────────────────────────────────────
try {
  const LineStrategy = require('passport-line-auth').Strategy;
  passport.use(
    new LineStrategy(
      {
        channelID: process.env.LINE_CLIENT_ID,
        channelSecret: process.env.LINE_CLIENT_SECRET,
        callbackURL: process.env.LINE_CALLBACK_URL,
        scope: ['profile', 'openid', 'email'],
      },
      async (accessToken, refreshToken, params, profile, done) => {
        try {
          const lineUserId = profile.id;
          const email =
            (profile.emails && profile.emails[0]?.value) ||
            emailFromIdToken(params?.id_token);
          const { user, status } = await resolveOAuthUser('lineUserId', lineUserId, email);
          if (status === 'active') return done(null, { token: signToken(user) });
          return done(null, false, { message: status });
        } catch (err) {
          return done(err);
        }
      }
    )
  );
} catch (e) {
  console.warn('[Passport] LINE strategy not loaded:', e.message);
}

// ─── Google Strategy ──────────────────────────────────────────────────────────
try {
  const GoogleStrategy = require('passport-google-oauth20').Strategy;
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const googleId = profile.id;
          const email = profile.emails?.[0]?.value || null;
          const { user, status } = await resolveOAuthUser('googleId', googleId, email);
          if (status === 'active') return done(null, { token: signToken(user) });
          return done(null, false, { message: status });
        } catch (err) {
          return done(err);
        }
      }
    )
  );
} catch (e) {
  console.warn('[Passport] Google strategy not loaded:', e.message);
}

passport.serializeUser((info, done) => done(null, info));
passport.deserializeUser((info, done) => done(null, info));

module.exports = passport;
