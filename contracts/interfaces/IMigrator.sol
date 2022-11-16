interface IMigrator {
   /// @param qty the quantity of tokens being moved into migrator contract for that user
   /// @param data arbitrary additional migration data
   function migrateReceive(address user, uint qty, bytes memory data) external returns (bool success);
}