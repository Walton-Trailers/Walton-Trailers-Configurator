import { db } from "./db";
import { 
  trailerCategories, 
  trailerModels, 
  modelVariants,
  trailerOptions,
  type InsertTrailerCategory,
  type InsertTrailerModel,
  type InsertModelVariant,
  type InsertTrailerOption
} from "@shared/schema";

// Categories from Walton Price Book
const waltonCategories: InsertTrailerCategory[] = [
  {
    slug: "gooseneck",
    name: "Gooseneck Trailers",
    description: "Heavy-duty gooseneck trailers with superior stability and higher payload capacity. Featuring tapered gooseneck design and I-beam construction.",
    imageUrl: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400",
    startingPrice: 12345,
    orderIndex: 1
  },
  {
    slug: "car-equipment",
    name: "Car/Equipment Haulers",
    description: "I-beam deckover equipment trailers designed for hauling vehicles and heavy equipment with slide-out ramps.",
    imageUrl: "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400",
    startingPrice: 9479,
    orderIndex: 2
  },
  {
    slug: "dump",
    name: "Dump Trailers",
    description: "Hydraulic dump trailers with scissor hoist systems. Available in 5', 7', and 8' widths with various wall height options.",
    imageUrl: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400",
    startingPrice: 8346,
    orderIndex: 3
  },
  {
    slug: "landscape",
    name: "Landscape Trailers",
    description: "Professional landscape trailers with side gates and mesh floors designed for landscaping crews.",
    imageUrl: "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400",
    startingPrice: 4250,
    orderIndex: 4
  },
  {
    slug: "utility",
    name: "Utility Trailers",
    description: "Versatile utility trailers for general hauling needs. Available in various sizes with angle iron construction.",
    imageUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400",
    startingPrice: 1995,
    orderIndex: 5
  },
  {
    slug: "tilt",
    name: "Tilt Equipment Trailers",
    description: "Full tilt equipment trailers for easy loading without ramps. Perfect for low-clearance equipment.",
    imageUrl: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400",
    startingPrice: 7500,
    orderIndex: 6
  }
];

// Models from Walton Price Book
const waltonModels: InsertTrailerModel[] = [
  // Gooseneck Models
  {
    categoryId: 1, // Will be updated with actual ID
    modelSeries: "FBH207",
    name: "Gooseneck Deckover 14K Trailer",
    pullType: "gooseneck",
    gvwrRange: "15,500",
    deckHeight: "36\"",
    overallWidth: "102\"",
    lengthRange: "20' - 26'",
    imageUrl: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400",
    standardFeatures: [
      "Mega Ramps",
      "Tapered Gooseneck",
      "10\" x 15 lb I-Beam Main Frame",
      "3\" Channel Cross Members on 24\" Centers",
      "Electric Self Adjusting Brakes",
      "Black Powder Coat with OTR Protective Additives",
      "2\" x 10\" Oil Treated Lumber Deck",
      "Under Deck Spare Tire Mount",
      "2 5/16\" Adjustable Gooseneck Coupler",
      "Dual 12K Drop Leg Jacks",
      "Front Lockable Toolbox",
      "Safety Chains with Stow Bar"
    ],
    orderIndex: 1
  },
  {
    categoryId: 1,
    modelSeries: "FBH208",
    name: "Gooseneck Deckover 16K Trailer",
    pullType: "gooseneck",
    gvwrRange: "18,000",
    deckHeight: "36\"",
    overallWidth: "102\"",
    lengthRange: "20' - 26'",
    imageUrl: "https://images.unsplash.com/photo-1581094794329-c8112a89af12?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400",
    standardFeatures: [
      "Mega Ramps",
      "Tapered Gooseneck",
      "10\" x 19 lb I-Beam Main Frame",
      "3\" Channel Cross Members on 24\" Centers",
      "Electric Self Adjusting Brakes",
      "Black Powder Coat with OTR Protective Additives",
      "2\" x 10\" Oil Treated Lumber Deck",
      "Under Deck Spare Tire Mount",
      "2 5/16\" Adjustable Gooseneck Coupler",
      "Dual 12K Drop Leg Jacks",
      "Front Lockable Toolbox",
      "Dexter Oil Bath Axles"
    ],
    orderIndex: 2
  },
  
  // Car/Equipment Hauler Models
  {
    categoryId: 2,
    modelSeries: "BDE207",
    name: "I-Beam Deckover Equipment 14K Trailer",
    pullType: "bumper",
    gvwrRange: "14,000",
    deckHeight: "36\"",
    overallWidth: "102\"", 
    lengthRange: "18' - 22'",
    imageUrl: "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400",
    standardFeatures: [
      "Straight Deck with 96\" Slide Out Ramps",
      "10\" x 15 lb I-Beam Main Frame",
      "3\" Channel Cross Members on 24\" Centers",
      "Electric Self Adjusting Brakes",
      "Black Powder Coat with OTR Protective Additives",
      "2\" x 10\" Oil Treated Lumber Deck",
      "Spare Tire Mount",
      "2 5/16\" Adjustable Coupler",
      "12K Drop Leg Jack",
      "Locking Toolbox"
    ],
    orderIndex: 1
  },
  
  // Dump Trailer Models
  {
    categoryId: 3,
    modelSeries: "DHV207",
    name: "7' Wide 14K Dump Trailer",
    pullType: "both",
    gvwrRange: "14,000 - 15,500",
    deckHeight: "31\"",
    overallWidth: "102\"",
    lengthRange: "14' - 16'",
    imageUrl: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400",
    standardFeatures: [
      "6\" Channel Main Frame",
      "3\" Channel Cross Members on 18\" Centers",
      "Electric Self Adjusting Brakes",
      "24\" Walls (12 ga.)",
      "10 ga. Floor",
      "516 Scissor Hoist with HPU",
      "Combo Barn Door / Spreader Gate",
      "4 - ⅝\" D-Rings",
      "Pull Style Tarp System",
      "72\" Slide-In Ramps",
      "12K Drop Leg Jack",
      "Front Locking Toolbox"
    ],
    orderIndex: 1
  },
  {
    categoryId: 3,
    modelSeries: "DHV208",
    name: "7' Wide Dump 16K Trailer",
    pullType: "both",
    gvwrRange: "16,000 - 18,000",
    deckHeight: "31\"",
    overallWidth: "102\"",
    lengthRange: "14' - 16'",
    imageUrl: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400",
    standardFeatures: [
      "8\" Channel Main Frame",
      "3\" Channel Cross Members on 18\" Centers",
      "Electric Self Adjusting Brakes",
      "24\" Walls (12 ga.)",
      "10 ga. Floor",
      "520 Scissor Hoist with HPU",
      "Combo Barn Door / Spreader Gate",
      "4 - ⅝\" D-Rings",
      "Pull Style Tarp System",
      "72\" Slide-In Ramps",
      "Dexter Oil Bath Axles"
    ],
    orderIndex: 2
  },
  {
    categoryId: 3,
    modelSeries: "DHO210",
    name: "8' Wide Deckover Dump 20K Trailer",
    pullType: "both",
    gvwrRange: "20,000 - 23,000",
    deckHeight: "36\"",
    overallWidth: "96.5\"",
    lengthRange: "16' - 18'",
    imageUrl: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&h=400",
    standardFeatures: [
      "10\" x 19 lb I-Beam Main Frame",
      "3\" Channel Cross Members on 16\" Centers",
      "Electric Self Adjusting Brakes",
      "24\" Walls (12 ga.)",
      "10 ga. Floor",
      "620 Scissor Hoist with HPU",
      "Combo Barn Door / Spreader Gate",
      "Pull Style Tarp System",
      "96\" Slide-In Ramps",
      "Dual 12K Drop Leg Jack",
      "Dexter GD Oil Bath Axles"
    ],
    orderIndex: 3
  }
];

// Model Variants from Price Book
const waltonVariants: InsertModelVariant[] = [
  // FBH207 Variants
  {
    modelId: 1, // FBH207
    variantCode: "FBH207-20G",
    tracCode: "09044FBH207",
    length: "20'",
    pullType: "G",
    msrp: 12345,
    gvwr: 15500,
    gawr: "7,000 (2)",
    emptyWeight: 4468,
    payload: 10432,
    bedSize: "96.5\" x 20'",
    overallSize: "102\" x 28'",
    orderIndex: 1
  },
  {
    modelId: 1,
    variantCode: "FBH207-22G",
    tracCode: "09494FBH207",
    length: "22'",
    pullType: "G",
    msrp: 12959,
    gvwr: 15500,
    gawr: "7,000 (2)",
    emptyWeight: 4628,
    payload: 10272,
    bedSize: "96.5\" x 22'",
    overallSize: "102\" x 30'",
    orderIndex: 2
  },
  {
    modelId: 1,
    variantCode: "FBH207-24G",
    tracCode: "09944FBH207",
    length: "24'",
    pullType: "G",
    msrp: 13574,
    gvwr: 15500,
    gawr: "7,000 (2)",
    emptyWeight: 4820,
    payload: 10080,
    bedSize: "96.5\" x 24'",
    overallSize: "102\" x 32'",
    orderIndex: 3
  },
  {
    modelId: 1,
    variantCode: "FBH207-26G",
    tracCode: "10394FBH207",
    length: "26'",
    pullType: "G",
    msrp: 14188,
    gvwr: 15500,
    gawr: "7,000 (2)",
    emptyWeight: 4996,
    payload: 9904,
    bedSize: "96.5\" x 26'",
    overallSize: "102\" x 34'",
    orderIndex: 4
  },
  
  // DHV207 Variants
  {
    modelId: 4, // DHV207
    variantCode: "DHV207-14B",
    tracCode: "09694DHV207",
    length: "14'",
    pullType: "B",
    msrp: 13232,
    gvwr: 14000,
    gawr: "7,000 (2)",
    emptyWeight: 4180,
    payload: 9820,
    bedSize: "83\" x 14'",
    overallSize: "102\" x 18'",
    capacity: "7.26 Cubic Yds.",
    orderIndex: 1
  },
  {
    modelId: 4,
    variantCode: "DHV207-16B",
    tracCode: "10194DHV207",
    length: "16'",
    pullType: "B",
    msrp: 13915,
    gvwr: 14000,
    gawr: "7,000 (2)",
    emptyWeight: 4430,
    payload: 9570,
    bedSize: "83\" x 16'",
    overallSize: "102\" x 20'",
    capacity: "8.30 Cubic Yds.",
    orderIndex: 2
  },
  {
    modelId: 4,
    variantCode: "DHV207-14G",
    tracCode: "10844DHV207",
    length: "14'",
    pullType: "G",
    msrp: 14802,
    gvwr: 15500,
    gawr: "7,000 (2)",
    emptyWeight: 5600,
    payload: 9900,
    bedSize: "83\" x 14'",
    overallSize: "102\" x 22'",
    capacity: "7.26 Cubic Yds.",
    orderIndex: 3
  },
  {
    modelId: 4,
    variantCode: "DHV207-16G",
    tracCode: "11344DHV207",
    length: "16'",
    pullType: "G",
    msrp: 15485,
    gvwr: 15500,
    gawr: "7,000 (2)",
    emptyWeight: 5850,
    payload: 9650,
    bedSize: "83\" x 16'",
    overallSize: "102\" x 24'",
    capacity: "8.30 Cubic Yds.",
    orderIndex: 4
  }
];

// Options from Price Book
const waltonOptions: InsertTrailerOption[] = [
  // Tire Options
  {
    optionCategory: "Tire Options",
    optionType: "tire_standard",
    name: "Standard ST235/80R16 \"E\" 10 Ply",
    description: "8 Lug 16\" Black Wheels",
    tracCode: "0000T5S7K",
    price: 0,
    isDefault: true,
    applicableModels: ["FBH207", "DHV207", "BDE207"],
    orderIndex: 1
  },
  {
    optionCategory: "Tire Options",
    optionType: "tire_upgrade",
    name: "ST235/85R16 \"G\" 14 Ply",
    description: "8 Lug 16\" Black Wheels",
    tracCode: "0438T5S7K",
    price: 600,
    isDefault: false,
    applicableModels: ["FBH207", "DHV207", "BDE207"],
    orderIndex: 2
  },
  {
    optionCategory: "Tire Options",
    optionType: "tire_standard",
    name: "Standard ST215/75R17.5 \"J\" 18 Ply",
    description: "8 Lug 17.5\" Black Wheels",
    tracCode: "0000T5S8K",
    price: 0,
    isDefault: true,
    applicableModels: ["FBH208", "DHV208", "BDE208"],
    orderIndex: 3
  },
  
  // Jack Options
  {
    optionCategory: "Jack Options",
    optionType: "jack_standard",
    name: "Standard Drop Leg Jack",
    description: "12K Drop Leg Jack",
    price: 0,
    isDefault: true,
    applicableModels: ["FBH", "DHV", "BDE"],
    orderIndex: 1
  },
  {
    optionCategory: "Jack Options", 
    optionType: "jack_2speed",
    name: "Dual 2-Speed Jacks",
    tracCode: "0225WT00",
    price: 300,
    isDefault: false,
    applicableModels: ["FBH"],
    orderIndex: 2
  },
  {
    optionCategory: "Jack Options",
    optionType: "jack_hydraulic", 
    name: "Dual 12K Hydraulic Jacks",
    tracCode: "1560WT00",
    price: 2000,
    isDefault: false,
    applicableModels: ["FBH", "DHO"],
    orderIndex: 3
  },
  {
    optionCategory: "Jack Options",
    optionType: "jack_hydraulic_single",
    name: "Single 12K Hydraulic Jack Upgrade",
    tracCode: "0988WT00",
    price: 1300,
    isDefault: false,
    applicableModels: ["DHV", "DHO"],
    orderIndex: 4
  },
  
  // Dump Gate Options
  {
    optionCategory: "Dump Gate Options",
    optionType: "gate_combo",
    name: "Combo Barn Door / Spreader Gate",
    tracCode: "0145WT00",
    price: 200,
    isDefault: false,
    applicableModels: ["DST", "DMD"],
    orderIndex: 1
  },
  {
    optionCategory: "Dump Gate Options",
    optionType: "gate_barn",
    name: "Barn Door",
    price: 0,
    isDefault: true,
    applicableModels: ["DHO"],
    orderIndex: 2
  },
  
  // Wall Height Options
  {
    optionCategory: "Wall Height Options",
    optionType: "wall_24",
    name: "24\" Walls",
    description: "Standard",
    price: 0,
    isDefault: true,
    applicableModels: ["DHV", "DHO"],
    orderIndex: 1
  },
  {
    optionCategory: "Wall Height Options",
    optionType: "wall_32",
    name: "32\" Walls",
    tracCode: "0915WT00",
    price: 1250,
    isDefault: false,
    applicableModels: ["DHO"],
    orderIndex: 2
  },
  {
    optionCategory: "Wall Height Options",
    optionType: "wall_32_board",
    name: "32\" Wall with Board Brackets",
    description: "24\" + 8\" Board",
    tracCode: "1030WT00",
    price: 1410,
    isDefault: false,
    applicableModels: ["DHV", "DHO"],
    orderIndex: 3
  },
  {
    optionCategory: "Wall Height Options",
    optionType: "wall_44",
    name: "44\" Walls",
    tracCode: "1040WT00",
    price: 1425,
    isDefault: false,
    applicableModels: ["DHO"],
    orderIndex: 4
  },
  
  // D-Ring Options
  {
    optionCategory: "D-Ring Options",
    optionType: "dring_5_8",
    name: "Additional D-Rings - ⅝\"",
    tracCode: "0018WT00",
    price: 25,
    priceUnit: "ea",
    isDefault: false,
    applicableModels: ["DHV", "DHO", "FBH"],
    orderIndex: 1
  },
  {
    optionCategory: "D-Ring Options",
    optionType: "dring_1",
    name: "Add - 1\" D-Rings",
    description: "Customer to specify placement",
    tracCode: "0026WT00",
    price: 35,
    priceUnit: "ea",
    isDefault: false,
    applicableModels: ["BDE"],
    orderIndex: 2
  },
  
  // Storage Options
  {
    optionCategory: "Storage Options",
    optionType: "storage_under_deck",
    name: "Under Deck Storage Box",
    description: "37\" x 10\" x 12\"",
    tracCode: "0195WT00",
    price: 245,
    isDefault: false,
    applicableModels: ["FBH", "BDE"],
    orderIndex: 1
  },
  {
    optionCategory: "Storage Options",
    optionType: "storage_upright",
    name: "Extra Storage Box in Uprights",
    tracCode: "0195WT00",
    price: 245,
    isDefault: false,
    applicableModels: ["DHO"],
    orderIndex: 2
  },
  
  // Other Options
  {
    optionCategory: "Other Options",
    optionType: "winch_track",
    name: "Sliding Winch Track",
    description: "Per 6 ft section",
    tracCode: "0131WT00",
    price: 180,
    priceUnit: "section",
    isDefault: false,
    applicableModels: ["FBH", "BDE"],
    orderIndex: 1
  },
  {
    optionCategory: "Other Options",
    optionType: "wireless_remote",
    name: "Wireless Remote",
    tracCode: "0250WT00",
    price: 350,
    isDefault: false,
    applicableModels: ["DHV", "DHO", "DST"],
    orderIndex: 2
  },
  {
    optionCategory: "Other Options",
    optionType: "solar_charger",
    name: "3 Watt Solar Charger / Maintainer",
    tracCode: "0146WT00", 
    price: 200,
    isDefault: false,
    applicableModels: ["DHV", "DHO", "DST"],
    orderIndex: 3
  },
  {
    optionCategory: "Other Options",
    optionType: "chain_spool",
    name: "Chain Spool",
    description: "Between Stake Pockets",
    tracCode: "0200WT00",
    price: 275,
    isDefault: false,
    applicableModels: ["FBH", "BDE"],
    orderIndex: 4
  }
];

export async function seedWaltonData() {
  console.log("Starting Walton data seed...");
  
  try {
    // Clear existing data - will be added back when userConfigurations table exists
    // await db.delete(trailerOptions);
    // await db.delete(modelVariants);
    // await db.delete(trailerModels);
    // await db.delete(trailerCategories);
    
    // Insert categories
    const insertedCategories = await db.insert(trailerCategories).values(waltonCategories).returning();
    console.log(`Inserted ${insertedCategories.length} categories`);
    
    // Create category ID map
    const categoryMap = new Map<string, number>();
    insertedCategories.forEach(cat => categoryMap.set(cat.slug, cat.id));
    
    // Update model category IDs
    const modelsWithCategoryIds = waltonModels.map(model => ({
      ...model,
      categoryId: categoryMap.get(
        model.categoryId === 1 ? "gooseneck" :
        model.categoryId === 2 ? "car-equipment" :
        model.categoryId === 3 ? "dump" :
        model.categoryId === 4 ? "landscape" :
        model.categoryId === 5 ? "utility" : "tilt"
      )!
    }));
    
    // Insert models
    const insertedModels = await db.insert(trailerModels).values(modelsWithCategoryIds).returning();
    console.log(`Inserted ${insertedModels.length} models`);
    
    // Create model ID map
    const modelMap = new Map<string, number>();
    insertedModels.forEach((model, index) => {
      modelMap.set(model.modelSeries, model.id);
    });
    
    // Update variant model IDs
    const variantsWithModelIds = waltonVariants.map(variant => ({
      ...variant,
      modelId: modelMap.get(
        variant.modelId === 1 ? "FBH207" :
        variant.modelId === 4 ? "DHV207" : "FBH207"
      )!
    }));
    
    // Insert variants
    const insertedVariants = await db.insert(modelVariants).values(variantsWithModelIds).returning();
    console.log(`Inserted ${insertedVariants.length} variants`);
    
    // Insert options
    const insertedOptions = await db.insert(trailerOptions).values(waltonOptions).returning();
    console.log(`Inserted ${insertedOptions.length} options`);
    
    console.log("Walton data seed completed successfully!");
  } catch (error) {
    console.error("Error seeding Walton data:", error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedWaltonData()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}