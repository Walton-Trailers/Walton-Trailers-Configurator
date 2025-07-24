import { db } from "./db";
import { trailerCategories, trailerModels, trailerOptions } from "@shared/schema";

async function seedDatabase() {
  console.log("🌱 Seeding database...");

  // Clear existing data
  await db.delete(trailerOptions);
  await db.delete(trailerModels);
  await db.delete(trailerCategories);

  // Insert categories
  const categories = await db.insert(trailerCategories).values([
    {
      slug: "gooseneck",
      name: "Gooseneck Trailers",
      description: "Heavy-duty trailers with superior stability and higher payload capacity. Perfect for construction and industrial applications.",
      imageUrl: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250",
      startingPrice: "18500"
    },
    {
      slug: "tilt",
      name: "Tilt Equipment Trailers",
      description: "Hydraulic tilt design for easy loading of heavy machinery and equipment. Built for maximum durability.",
      imageUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250",
      startingPrice: "15200"
    },
    {
      slug: "dump",
      name: "Dump Trailers",
      description: "Hydraulic dump systems with reinforced beds. Ideal for landscaping, construction, and material hauling.",
      imageUrl: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250",
      startingPrice: "12500"
    },
    {
      slug: "hauler",
      name: "Car/Equipment Haulers",
      description: "Low-profile design with drive-over fenders. Perfect for transporting vehicles and low-clearance equipment.",
      imageUrl: "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250",
      startingPrice: "14800"
    },
    {
      slug: "landscape",
      name: "Landscape Trailers",
      description: "Side gates and removable ramps for easy loading. Designed specifically for landscaping professionals.",
      imageUrl: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&h=250",
      startingPrice: "8900"
    }
  ]).returning();

  console.log(`✅ Inserted ${categories.length} categories`);

  // Insert models
  const models = await db.insert(trailerModels).values([
    {
      categoryId: 3, // dump
      modelId: "DHO215",
      name: "DHO215 - 16' Dump Trailer",
      gvwr: "15,400 lbs",
      payload: "12,600 lbs",
      deckSize: "16' x 83\"",
      axles: "Dual 7K",
      basePrice: "12500",
      imageUrl: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400",
      features: ["12V Hydraulic Pump", "Tarp Kit", "LED Lighting", "7K Axles"]
    },
    {
      categoryId: 3, // dump
      modelId: "DTX620",
      name: "DTX620 - 20' Heavy Duty Dump",
      gvwr: "20,000 lbs",
      payload: "16,800 lbs",
      deckSize: "20' x 96\"",
      axles: "Triple 7K",
      basePrice: "18900",
      imageUrl: "https://images.unsplash.com/photo-1586798271628-e8463d8c3c30?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400",
      features: ["24V Hydraulic System", "Premium Tarp", "LED Package", "Triple Axles"]
    },
    {
      categoryId: 1, // gooseneck
      modelId: "FBX210",
      name: "FBX210 - 28' Gooseneck Flatbed",
      gvwr: "25,000 lbs",
      payload: "20,200 lbs",
      deckSize: "28' x 102\"",
      axles: "Dual 12K",
      basePrice: "18500",
      imageUrl: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400",
      features: ["Gooseneck Hitch", "Wood Deck", "LED Lights", "Adjustable Coupler"]
    },
    {
      categoryId: 2, // tilt
      modelId: "TSX208",
      name: "TSX208 - 20' Tilt Equipment",
      gvwr: "16,000 lbs",
      payload: "13,200 lbs",
      deckSize: "20' x 83\"",
      axles: "Dual 8K",
      basePrice: "15200",
      imageUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400",
      features: ["Hydraulic Tilt", "Steel Deck", "Winch Track", "Tool Box"]
    }
  ]).returning();

  console.log(`✅ Inserted ${models.length} models`);

  // Insert options
  const options = await db.insert(trailerOptions).values([
    // DHO215 options
    { modelId: "DHO215", category: "tires", name: "Standard ST235/85R16", price: "0", isMultiSelect: false },
    { modelId: "DHO215", category: "tires", name: "ST235/85R16 \"G\" 14-ply", price: "600", isMultiSelect: false },
    { modelId: "DHO215", category: "ramps", name: "No Ramp", price: "0", isMultiSelect: false },
    { modelId: "DHO215", category: "ramps", name: "Slide-in Ramps", price: "450", isMultiSelect: false },
    { modelId: "DHO215", category: "color", name: "Standard Black", price: "0", isMultiSelect: false },
    { modelId: "DHO215", category: "color", name: "Custom Color", price: "1200", isMultiSelect: false },
    { modelId: "DHO215", category: "extras", name: "Toolbox", price: "850", isMultiSelect: true },
    { modelId: "DHO215", category: "extras", name: "Spare Tire Mount", price: "200", isMultiSelect: true },
    { modelId: "DHO215", category: "extras", name: "D-Rings (4)", price: "120", isMultiSelect: true },
    
    // DTX620 options
    { modelId: "DTX620", category: "tires", name: "Standard ST235/85R16", price: "0", isMultiSelect: false },
    { modelId: "DTX620", category: "tires", name: "ST235/85R16 \"G\" 14-ply", price: "900", isMultiSelect: false },
    { modelId: "DTX620", category: "walls", name: "Standard 24\" Walls", price: "0", isMultiSelect: false },
    { modelId: "DTX620", category: "walls", name: "High 36\" Walls", price: "1500", isMultiSelect: false },
    { modelId: "DTX620", category: "color", name: "Standard Black", price: "0", isMultiSelect: false },
    { modelId: "DTX620", category: "color", name: "Custom Color", price: "1200", isMultiSelect: false },
    
    // FBX210 options
    { modelId: "FBX210", category: "deck", name: "24' Length", price: "-2000", isMultiSelect: false },
    { modelId: "FBX210", category: "deck", name: "28' Length", price: "0", isMultiSelect: false },
    { modelId: "FBX210", category: "deck", name: "32' Length", price: "3000", isMultiSelect: false },
    { modelId: "FBX210", category: "ramps", name: "No Ramps", price: "0", isMultiSelect: false },
    { modelId: "FBX210", category: "ramps", name: "8' Slide-in Ramps", price: "1200", isMultiSelect: false },
    
    // TSX208 options
    { modelId: "TSX208", category: "winch", name: "No Winch", price: "0", isMultiSelect: false },
    { modelId: "TSX208", category: "winch", name: "12V Electric Winch", price: "1500", isMultiSelect: false }
  ]).returning();

  console.log(`✅ Inserted ${options.length} options`);
  console.log("🎉 Database seeded successfully!");
}

// Run the seeding function
seedDatabase().catch(console.error);