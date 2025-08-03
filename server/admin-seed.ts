import { storage } from "./storage";
import { hashPassword } from "./auth";

async function createInitialAdminUser() {
  try {
    // Skip if no database in production
    if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
      console.log("No database configured - skipping admin user creation.");
      return;
    }
    
    // Check if any admin users exist
    const existingUsers = await storage.getAllAdminUsers();
    
    if (existingUsers.length > 0) {
      console.log("Admin users already exist. Skipping seed.");
      return;
    }

    // Create initial admin user
    const adminPassword = "admin123"; // Should be changed on first login
    const passwordHash = await hashPassword(adminPassword);

    const adminUser = await storage.createAdminUser({
      username: "admin",
      email: "admin@waltontrailers.com",
      firstName: "System",
      lastName: "Administrator",
      role: "admin",
      isActive: true,
      passwordHash,
    });

    console.log("✅ Initial admin user created:");
    console.log("   Username: admin");
    console.log("   Password: admin123");
    console.log("   Email: admin@waltontrailers.com");
    console.log("   ⚠️  Please change this password on first login!");

    // Create a standard user as well
    const standardPassword = "user123";
    const standardPasswordHash = await hashPassword(standardPassword);

    const standardUser = await storage.createAdminUser({
      username: "employee",
      email: "employee@waltontrailers.com",
      firstName: "Standard",
      lastName: "Employee",
      role: "standard",
      isActive: true,
      passwordHash: standardPasswordHash,
    });

    console.log("✅ Standard user created:");
    console.log("   Username: employee");
    console.log("   Password: user123");
    console.log("   Email: employee@waltontrailers.com");

  } catch (error) {
    console.error("❌ Error creating initial admin user:", error);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createInitialAdminUser()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { createInitialAdminUser };