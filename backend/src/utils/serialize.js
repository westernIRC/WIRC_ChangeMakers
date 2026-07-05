function publicUser(user, streak) {
  return {
    id: user.id,
    name: user.isAnonymous ? "Anonymous" : user.name,
    isAnonymous: user.isAnonymous,
    year: user.year,
    program: user.program,
    cause: user.cause,
    fundraisingLink: user.fundraisingLink,
    houseId: user.houseId,
    streak: streak ?? null,
  };
}

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
