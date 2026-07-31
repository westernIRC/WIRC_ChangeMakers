// Anonymity has to cover more than the name field. A personal fundraising link almost always
// contains the fundraiser's name in its slug or page title, and year + program + cause together
// narrow a member down to one person inside a House of a dozen. Masking the name alone would
// give members a false sense of privacy, so an anonymous profile withholds all of it.
function publicUser(user, streak) {
  if (user.isAnonymous) {
    return {
      id: user.id,
      name: "Anonymous",
      isAnonymous: true,
      year: null,
      program: null,
      cause: null,
      fundraisingLink: null,
      houseId: user.houseId,
      streak: streak ?? null,
    };
  }

  return {
    id: user.id,
    name: user.name,
    isAnonymous: false,
    year: user.year,
    program: user.program,
    cause: user.cause,
    fundraisingLink: user.fundraisingLink,
    houseId: user.houseId,
    streak: streak ?? null,
  };
}

// Admin views are deliberately unmasked - a VP needs to know who they're looking at to do
// their job. Anonymity is a promise to other members and the public, not to House leadership.
function adminUser(user, streak) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    isAnonymous: user.isAnonymous,
    year: user.year,
    program: user.program,
    cause: user.cause,
    fundraisingLink: user.fundraisingLink,
    role: user.role,
    houseId: user.houseId,
    streak: streak ?? null,
  };
}

module.exports = { publicUser, adminUser };
