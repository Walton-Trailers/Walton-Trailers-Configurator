import { storage } from "./storage";
import { hashPassword } from "./auth";

async function createInitialAdminUser() {
  try {
    // Skip if no database in production
    if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
      console.log("No database configured - skipping admin user creation.");
      return;
    }
    
    // In production, skip database check to avoid hanging
    if (process.env.NODE_ENV === 'production') {
      console.log('Skipping admin user check in production mode');
      return;
    }
    
    // Check if any admin users exist with timeout
    let existingUsers: any[] = [];
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database query timeout')), 5000)
      );
      existingUsers = await Promise.race([
        storage.getAllAdminUsers(),
        timeoutPromise
      ]) as any[];
    } catch (error) {
      console.error('Error checking existing users:', error);
      return;
    }
    
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

// Run if called directly (disabled in production to prevent auto-execution)
if (process.env.NODE_ENV !== 'production' && import.meta.url === `file://${process.argv[1]}`) {
  createInitialAdminUser()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { createInitialAdminUser };