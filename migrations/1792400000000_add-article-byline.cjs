/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  // Optional free-text credit shown instead of the account holder's name,
  // for publishing reports by people who don't have a user account.
  pgm.addColumns("articles", {
    byline: { type: "text" },
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.dropColumns("articles", ["byline"]);
};
