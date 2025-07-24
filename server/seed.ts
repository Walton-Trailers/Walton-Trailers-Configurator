import { db } from "./db";
import { trailerCategories, trailerModels, trailerOptions } from "@shared/schema";

async function seedDatabase() {
  console.log("🌱 Seeding database...");

  // Clear existing data - commented out for now to avoid errors
  // await db.delete(trailerOptions);
  // await db.delete(trailerModels);
  // await db.delete(trailerCategories);

  // Insert categories from Walton Price Book 2025
  const categories = await db.insert(trailerCategories).values([
    {
      slug: "gooseneck",
      name: "Gooseneck Trailers",
      description: "Heavy-duty gooseneck trailers with superior stability and higher payload capacity. Featuring tapered gooseneck design and I-beam construction.",
      image_url: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250",
      starting_price: 12345
    },
    {
      slug: "car-equipment",
      name: "Car/Equipment Haulers",
      description: "I-beam deckover equipment trailers designed for hauling vehicles and heavy equipment with slide-out ramps.",
      image_url: "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250",
      starting_price: 9479
    },
    {
      slug: "dump",
      name: "Dump Trailers",
      description: "Hydraulic dump trailers with scissor hoist systems. Available in 5', 7', and 8' widths with various wall height options.",
      image_url: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250",
      starting_price: 8346
    },
    {
      slug: "landscape",
      name: "Landscape Trailers",
      description: "Professional landscape trailers with side gates and mesh floors designed for landscaping crews.",
      image_url: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250",
      starting_price: 4250
    },
    {
      slug: "utility",
      name: "Utility Trailers",
      description: "Versatile utility trailers for general hauling needs. Available in various sizes with angle iron construction.",
      image_url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250",
      starting_price: 1995
    },
    {
      slug: "tilt",
      name: "Tilt Equipment Trailers",
      description: "Full tilt equipment trailers for easy loading without ramps. Perfect for low-clearance equipment.",
      image_url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250",
      starting_price: 7500
    }
  ]).returning();

  console.log(`✅ Inserted ${categories.length} categories`);

  // Insert models from Walton Price Book 2025
  const models = await db.insert(trailerModels).values([
    // Gooseneck Models
    {
      category_id: 1, // gooseneck
      model_id: "FBH207",
      name: "FBH207 - Gooseneck Deckover 14K",
      gvwr: "15,500 lbs",
      payload: "10,432 lbs",
      deck_size: "96.5\" x 20-26'",
      axles: "Dual 7K",
      base_price: 12345,
      image_url: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400",
      features: ["Mega Ramps", "10\" x 15 lb I-Beam", "2\" x 10\" Oil Treated Lumber", "Dual 12K Drop Leg Jacks", "Front Lockable Toolbox"]
    },
    {
      category_id: 1, // gooseneck
      model_id: "FBH208",
      name: "FBH208 - Gooseneck Deckover 16K",
      gvwr: "18,000 lbs",
      payload: "13,432 lbs",
      deck_size: "96.5\" x 20-26'",
      axles: "Dual 8K",
      base_price: 14782,
      image_url: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400",
      features: ["Mega Ramps", "10\" x 19 lb I-Beam", "Dexter Oil Bath Axles", "Dual 12K Drop Leg Jacks", "Front Lockable Toolbox"]
    },
    {
      category_id: 1, // gooseneck
      model_id: "FBX307",
      name: "FBX307 - Triple Axle Gooseneck 21K",
      gvwr: "24,000 lbs",
      payload: "18,700 lbs",
      deck_size: "96.5\" x 24-28'",
      axles: "Triple 7K",
      base_price: 16715,
      image_url: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400",
      features: ["Mega Ramps", "10\" x 19 lb I-Beam", "Chain Spool", "Dexter E-Z Lube Axles", "Front Lockable Toolbox"]
    },
    {
      category_id: 1, // gooseneck
      model_id: "FBX210",
      name: "FBX210 - Gooseneck Deckover 20K",
      gvwr: "23,000 lbs",
      payload: "17,168 lbs",
      deck_size: "96.5\" x 24-30'",
      axles: "Dual 10K",
      base_price: 17015,
      image_url: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400",
      features: ["Mega Ramps", "10\" x 19 lb I-Beam", "Chain Spool", "Dexter GD Oil Bath Axles", "Front Lockable Toolbox"]
    },
    
    // Car/Equipment Haulers
    {
      category_id: 2, // car-equipment
      model_id: "BDE207",
      name: "BDE207 - I-Beam Deckover 14K",
      gvwr: "14,000 lbs",
      payload: "10,550 lbs",
      deck_size: "96.5\" x 18-22'",
      axles: "Dual 7K",
      base_price: 9479,
      image_url: "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400",
      features: ["96\" Slide Out Ramps", "10\" x 15 lb I-Beam", "Locking Toolbox", "12K Drop Leg Jack", "Spare Tire Mount"]
    },
    {
      category_id: 2, // car-equipment
      model_id: "BDE208",
      name: "BDE208 - I-Beam Deckover 16K",
      gvwr: "16,000 lbs",
      payload: "12,450 lbs",
      deck_size: "96.5\" x 18-22'",
      axles: "Dual 8K",
      base_price: 11779,
      image_url: "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400",
      features: ["96\" Slide Out Ramps", "10\" x 19 lb I-Beam", "Dexter Oil Bath Axles", "12K Drop Leg Jack", "Locking Toolbox"]
    },
    {
      category_id: 2, // car-equipment
      model_id: "BDE307",
      name: "BDE307 - I-Beam Deckover 21K",
      gvwr: "21,000 lbs",
      payload: "16,442 lbs",
      deck_size: "96.5\" x 20-24'",
      axles: "Triple 7K",
      base_price: 13095,
      image_url: "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400",
      features: ["96\" Slide Out Ramps", "10\" x 19 lb I-Beam", "Dual 12K Drop Leg Jacks", "Dexter E-Z Lube Axles", "Locking Toolbox"]
    },
    
    // Dump Trailers
    {
      category_id: 3, // dump
      model_id: "DHV207",
      name: "DHV207 - 7' Wide 14K Dump",
      gvwr: "14,000 lbs",
      payload: "9,820 lbs",
      deck_size: "83\" x 14-16'",
      axles: "Dual 7K",
      base_price: 13232,
      image_url: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400",
      features: ["516 Scissor Hoist", "Combo Barn/Spreader Gate", "Pull Style Tarp", "72\" Slide-In Ramps", "4 D-Rings"]
    },
    {
      category_id: 3, // dump
      model_id: "DHV208",
      name: "DHV208 - 7' Wide 16K Dump",
      gvwr: "16,000 lbs",
      payload: "11,710 lbs",
      deck_size: "83\" x 14-16'",
      axles: "Dual 8K",
      base_price: 16761,
      image_url: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400",
      features: ["520 Scissor Hoist", "Combo Barn/Spreader Gate", "Pull Style Tarp", "72\" Slide-In Ramps", "Dexter Oil Bath Axles"]
    },
    {
      category_id: 3, // dump
      model_id: "DHO210",
      name: "DHO210 - 8' Wide Deckover 20K Dump",
      gvwr: "20,000 lbs",
      payload: "14,850 lbs",
      deck_size: "92\" x 16-18'",
      axles: "Dual 10K",
      base_price: 21695,
      image_url: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400",
      features: ["620 Scissor Hoist", "10\" x 19 lb I-Beam", "Pull Style Tarp", "96\" Slide-In Ramps", "Dual 12K Drop Leg Jacks"]
    },
    {
      category_id: 3, // dump
      model_id: "DHO212",
      name: "DHO212 - 8' Wide Deckover 24K Dump",
      gvwr: "25,500 lbs",
      payload: "19,150 lbs",
      deck_size: "92\" x 16-20'",
      axles: "Dual 12K",
      base_price: 24425,
      image_url: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400",
      features: ["625 Scissor Hoist", "4' Solid Sides", "Pull Style Tarp", "96\" Slide-In Ramps", "Dexter Oil Bath Axles"]
    },
    {
      category_id: 3, // dump
      model_id: "DHO215",
      name: "DHO215 - 8' Wide Deckover 30K Dump",
      gvwr: "30,000 lbs",
      payload: "23,450 lbs",
      deck_size: "92\" x 16-20'",
      axles: "Dual 15K",
      base_price: 29824,
      image_url: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400",
      features: ["630 Scissor Hoist", "4' Solid Sides", "10\" x 22 lb I-Beam", "96\" Slide-In Ramps", "Dexter Oil Bath Axles"]
    }
  ]).returning();

  console.log(`✅ Inserted ${models.length} models`);

  // Insert options from Walton Price Book 2025
  const options = await db.insert(trailerOptions).values([
    // Gooseneck Tire Options (FBH207, FBH208, FBX307, FBX210)
    { model_id: "FBH207", category: "tires", name: "Standard ST235/80R16 \"E\" 10 Ply", price: 0, is_multi_select: false },
    { model_id: "FBH207", category: "tires", name: "ST235/85R16 \"G\" 14 Ply Upgrade", price: 600, is_multi_select: false },
    { model_id: "FBH208", category: "tires", name: "Standard ST215/75R17.5 \"J\" 18 Ply", price: 0, is_multi_select: false },
    { model_id: "FBX307", category: "tires", name: "Standard ST235/80R16 \"E\" 10 Ply", price: 0, is_multi_select: false },
    { model_id: "FBX307", category: "tires", name: "ST235/85R16 \"G\" 14 Ply Upgrade", price: 825, is_multi_select: false },
    { model_id: "FBX210", category: "tires", name: "Standard ST235/80R16 \"E\" 10 Ply (Dual)", price: 0, is_multi_select: false },
    { model_id: "FBX210", category: "tires", name: "ST235/85R16 \"G\" 14 Ply (Dual) Upgrade", price: 1300, is_multi_select: false },
    
    // Gooseneck Jack Options
    { model_id: "FBH207", category: "jack", name: "Dual 2-Speed Jacks", price: 300, is_multi_select: false },
    { model_id: "FBH207", category: "jack", name: "Dual 12K Hydraulic Jacks", price: 2000, is_multi_select: false },
    { model_id: "FBH208", category: "jack", name: "Dual 2-Speed Jacks", price: 300, is_multi_select: false },
    { model_id: "FBH208", category: "jack", name: "Dual 12K Hydraulic Jacks", price: 2000, is_multi_select: false },
    
    // Gooseneck Ramp Options
    { model_id: "FBH207", category: "ramps", name: "Mega Ramps (Standard)", price: 0, is_multi_select: false },
    { model_id: "FBH207", category: "ramps", name: "Straight Deck w/ 96\" Slide Out Ramps", price: -500, is_multi_select: false },
    { model_id: "FBH208", category: "ramps", name: "Mega Ramps (Standard)", price: 0, is_multi_select: false },
    { model_id: "FBH208", category: "ramps", name: "Straight Deck w/ 96\" Slide Out Ramps", price: -500, is_multi_select: false },
    
    // Gooseneck Additional Options
    { model_id: "FBH207", category: "extras", name: "Winch Plate, Gooseneck Mounted", price: 170, is_multi_select: true },
    { model_id: "FBH207", category: "extras", name: "LED Light Bar", price: 400, is_multi_select: true },
    { model_id: "FBH207", category: "extras", name: "Under Deck Storage Box", price: 245, is_multi_select: true },
    { model_id: "FBH207", category: "extras", name: "Chain Spool", price: 275, is_multi_select: true },
    { model_id: "FBH207", category: "extras", name: "D-Rings (⅝\") Each", price: 25, is_multi_select: true },
    
    // Car/Equipment Hauler Options (BDE207, BDE208, BDE307)
    { model_id: "BDE207", category: "tires", name: "Standard ST235/80R16 \"E\" 10 Ply", price: 0, is_multi_select: false },
    { model_id: "BDE207", category: "tires", name: "ST235/85R16 \"G\" 14 Ply Upgrade", price: 600, is_multi_select: false },
    { model_id: "BDE208", category: "tires", name: "Standard ST215/75R17.5 \"J\" 18 Ply", price: 0, is_multi_select: false },
    { model_id: "BDE307", category: "tires", name: "Standard ST235/80R16 \"E\" 10 Ply", price: 0, is_multi_select: false },
    { model_id: "BDE307", category: "tires", name: "ST235/85R16 \"G\" 14 Ply Upgrade", price: 825, is_multi_select: false },
    
    // Dump Trailer Options (DHV207, DHV208, DHO210, DHO212, DHO215)
    { model_id: "DHV207", category: "tires", name: "Standard ST235/80R16 \"E\" 10 Ply", price: 0, is_multi_select: false },
    { model_id: "DHV207", category: "tires", name: "ST235/85R16 \"G\" 14 Ply Upgrade", price: 600, is_multi_select: false },
    { model_id: "DHV208", category: "tires", name: "Standard ST215/75R17.5 \"J\" 18 Ply", price: 0, is_multi_select: false },
    { model_id: "DHO210", category: "tires", name: "Standard ST235/80R16 \"E\" 10 Ply (Dual)", price: 0, is_multi_select: false },
    { model_id: "DHO210", category: "tires", name: "ST235/85R16 \"G\" 14 Ply (Dual) Upgrade", price: 1300, is_multi_select: false },
    { model_id: "DHO212", category: "tires", name: "Standard ST235/80R16 \"E\" 10 Ply (Dual)", price: 0, is_multi_select: false },
    { model_id: "DHO212", category: "tires", name: "ST235/85R16 \"G\" 14 Ply (Dual) Upgrade", price: 1300, is_multi_select: false },
    { model_id: "DHO215", category: "tires", name: "Standard ST215/75R17.5 \"J\" 18 Ply (Dual)", price: 0, is_multi_select: false },
    
    // Dump Trailer Jack Options
    { model_id: "DHV207", category: "jack", name: "Single 12K Hydraulic Jack Upgrade", price: 1300, is_multi_select: false },
    { model_id: "DHV208", category: "jack", name: "Single 12K Hydraulic Jack Upgrade", price: 1300, is_multi_select: false },
    { model_id: "DHO210", category: "jack", name: "Single 12K Hydraulic Jack Upgrade", price: 1300, is_multi_select: false },
    { model_id: "DHO210", category: "jack", name: "Dual 12K Hydraulic Jack Upgrade", price: 2000, is_multi_select: false },
    { model_id: "DHO212", category: "jack", name: "Dual 12K Hydraulic Jack Upgrade", price: 2000, is_multi_select: false },
    
    // Dump Trailer Wall Height Options
    { model_id: "DHV207", category: "walls", name: "24\" Walls (Standard)", price: 0, is_multi_select: false },
    { model_id: "DHV207", category: "walls", name: "32\" Wall with Board Brackets", price: 1030, is_multi_select: false },
    { model_id: "DHV208", category: "walls", name: "24\" Walls (Standard)", price: 0, is_multi_select: false },
    { model_id: "DHV208", category: "walls", name: "32\" Wall with Board Brackets", price: 1030, is_multi_select: false },
    { model_id: "DHO210", category: "walls", name: "24\" Walls (Standard)", price: 0, is_multi_select: false },
    { model_id: "DHO210", category: "walls", name: "32\" Walls", price: 1250, is_multi_select: false },
    { model_id: "DHO210", category: "walls", name: "44\" Walls", price: 1425, is_multi_select: false },
    { model_id: "DHO210", category: "walls", name: "44\" Wall with 18\" Fold (One Side)", price: 2125, is_multi_select: false },
    { model_id: "DHO210", category: "walls", name: "44\" Wall with 18\" Fold (Both Sides)", price: 2825, is_multi_select: false },
    { model_id: "DHO212", category: "walls", name: "4' Solid Sides (Standard)", price: 0, is_multi_select: false },
    { model_id: "DHO215", category: "walls", name: "4' Solid Sides (Standard)", price: 0, is_multi_select: false },
    
    // Dump Trailer Tarp Options
    { model_id: "DHV207", category: "tarp", name: "Pull Style Tarp (Standard)", price: 0, is_multi_select: false },
    { model_id: "DHV208", category: "tarp", name: "Pull Style Tarp (Standard)", price: 0, is_multi_select: false },
    { model_id: "DHO210", category: "tarp", name: "Pull Style Tarp (Standard)", price: 0, is_multi_select: false },
    { model_id: "DHO210", category: "tarp", name: "Long Arm Tarp System", price: 1900, is_multi_select: false },
    { model_id: "DHO212", category: "tarp", name: "Pull Style Tarp (Standard)", price: 0, is_multi_select: false },
    { model_id: "DHO212", category: "tarp", name: "Long Arm Tarp System", price: 1900, is_multi_select: false },
    
    // Dump Trailer Additional Options
    { model_id: "DHV207", category: "extras", name: "Wireless Remote", price: 350, is_multi_select: true },
    { model_id: "DHV207", category: "extras", name: "3 Watt Solar Charger", price: 200, is_multi_select: true },
    { model_id: "DHV207", category: "extras", name: "Additional D-Rings (⅝\")", price: 25, is_multi_select: true },
    { model_id: "DHV208", category: "extras", name: "Wireless Remote", price: 350, is_multi_select: true },
    { model_id: "DHV208", category: "extras", name: "3 Watt Solar Charger", price: 200, is_multi_select: true },
    { model_id: "DHO210", category: "extras", name: "Wireless Remote", price: 350, is_multi_select: true },
    { model_id: "DHO210", category: "extras", name: "3 Watt Solar Charger", price: 200, is_multi_select: true },
    { model_id: "DHO210", category: "extras", name: "Rear Support Stands", price: 265, is_multi_select: true },
    { model_id: "DHO210", category: "extras", name: "7 ga. Floor Upgrade (per ft)", price: 60, is_multi_select: true },
    { model_id: "DHO210", category: "extras", name: "Deck on Neck", price: 2050, is_multi_select: true }
  ]).returning();

  console.log(`✅ Inserted ${options.length} options`);
  console.log("🎉 Database seeded successfully!");
}

// Run the seeding function
seedDatabase().catch(console.error);