// Script to fix Stuart D's password
import bcrypt from 'bcryptjs';
import { db } from './db';
import { adminUsers } from '@shared/schema';
import { eq } from 'drizzle-orm';

async function fixPassword() {
  try {
    // Set a new password for Stuart D
    const newPassword = 'walton2025'; // Temporary password
    const passwordHash = await bcrypt.hash(newPassword, 10);
    
    // Update Stuart D's password (username: "Stuart D")
    const result = await db.update(adminUsers)
      .set({ passwordHash })
      .where(eq(adminUsers.username, 'Stuart D'))
      .returning();
    
    if (result.length > 0) {
      console.log('✅ Password reset successfully for Stuart D');
      console.log('Username: Stuart D');
      console.log('New Password: walton2025');
      console.log('Please change this password after logging in');
    } else {
      console.log('❌ User "Stuart D" not found');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error resetting password:', error);
    process.exit(1);
  }
}

fixPassword();