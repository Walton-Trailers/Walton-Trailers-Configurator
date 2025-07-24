// Detailed information about trailer options for the info modals
export interface OptionInfo {
  title: string;
  description: string;
  benefits: string[];
  specifications?: Record<string, string>;
  imageUrl?: string;
}

export const trailerOptionInfo: Record<string, OptionInfo> = {
  // Tire Options
  "Standard ST235/80R16 \"E\" 10 Ply": {
    title: "Standard Radial Tires",
    description: "Our standard tire configuration provides reliable performance for most hauling applications.",
    benefits: [
      "Load Range E (10 ply) for heavy-duty applications",
      "ST235/80R16 size fits standard 16\" wheels", 
      "Reliable performance for highway and local hauling",
      "Cost-effective option for general use"
    ],
    specifications: {
      "Load Capacity": "3,042 lbs per tire",
      "Maximum PSI": "80 PSI",
      "Tire Type": "Special Trailer (ST)",
      "Ply Rating": "10 Ply (Load Range E)"
    }
  },
  
  "ST235/85R16 \"G\" 14 Ply Upgrade": {
    title: "Heavy-Duty Tire Upgrade",
    description: "Upgraded tires with higher load capacity and enhanced durability for demanding applications.",
    benefits: [
      "Increased load capacity with 14 ply construction",
      "Enhanced sidewall strength for heavy loads",
      "Better heat resistance for long-distance hauling",
      "Reduced risk of blowouts under maximum load"
    ],
    specifications: {
      "Load Capacity": "3,750 lbs per tire",
      "Maximum PSI": "110 PSI", 
      "Tire Type": "Special Trailer (ST)",
      "Ply Rating": "14 Ply (Load Range G)"
    }
  },

  // Jack Options
  "Dual 2-Speed Jacks": {
    title: "2-Speed Drop Leg Jacks",
    description: "Upgraded jacks with high and low speed settings for faster operation and easier positioning.",
    benefits: [
      "Two-speed operation for efficiency",
      "High speed for quick positioning",
      "Low speed with more torque for heavy loads",
      "Easier operation compared to single-speed jacks"
    ],
    specifications: {
      "Lift Capacity": "12,000 lbs static load",
      "Travel": "24 inches",
      "Gear Ratio": "High: 3:1, Low: 15:1",
      "Handle Type": "Swivel handle"
    }
  },

  "Dual 12K Hydraulic Jacks": {
    title: "Hydraulic Drop Leg Jacks",
    description: "Premium hydraulic jacks provide effortless operation with superior lifting capacity and stability.",
    benefits: [
      "Effortless hydraulic operation",
      "No manual cranking required",
      "Superior stability and support",
      "Weather-resistant hydraulic system",
      "Faster setup and breakdown"
    ],
    specifications: {
      "Lift Capacity": "12,000 lbs per jack",
      "Operating Pressure": "3,000 PSI",
      "Cylinder Type": "Single-acting",
      "Power": "12V electric pump"
    }
  },

  // Ramp Options
  "Mega Ramps (Standard)": {
    title: "Mega Ramps",
    description: "Heavy-duty ramps built into the trailer deck provide convenient loading without separate equipment.",
    benefits: [
      "Built-in convenience - no separate ramps needed",
      "Heavy-duty construction matches trailer capacity",
      "Secure storage when not in use",
      "Full-width loading capability"
    ],
    specifications: {
      "Width": "96 inches (full deck width)",
      "Capacity": "Matches trailer GVWR",
      "Material": "Steel construction",
      "Storage": "Folds under deck when not in use"
    }
  },

  "Straight Deck w/ 96\" Slide Out Ramps": {
    title: "Slide-Out Ramps",
    description: "Removable slide-out ramps provide flexibility while maintaining a straight deck design.",
    benefits: [
      "Straight deck design for versatile loading",
      "Slide-out ramps store underneath",
      "Can be removed for other loading methods",
      "Lower deck height when ramps removed"
    ],
    specifications: {
      "Ramp Width": "96 inches",
      "Storage": "Slides under deck",
      "Deck Type": "Straight (no built-in ramps)",
      "Removable": "Yes"
    }
  },

  // Extra Options
  "LED Light Bar": {
    title: "LED Light Bar",
    description: "High-intensity LED light bar provides superior illumination for night loading and work area lighting.",
    benefits: [
      "Bright LED illumination for safety",
      "Low power consumption",
      "Long lifespan compared to halogen",
      "Weather-resistant construction",
      "Improves visibility during loading/unloading"
    ],
    specifications: {
      "Power": "12V DC",
      "Lumens": "3,600 lumens",
      "Beam Pattern": "Flood pattern",
      "Mounting": "Trailer frame mounted"
    }
  },

  "Chain Spool": {
    title: "Chain Storage Spool",
    description: "Convenient storage solution for tie-down chains and binders, keeping them organized and easily accessible.",
    benefits: [
      "Organized chain storage",
      "Prevents chain tangling",
      "Easy access during loading",
      "Keeps chains off the deck",
      "Weather protection"
    ],
    specifications: {
      "Capacity": "Up to 20 feet of 3/8\" chain",
      "Material": "Steel construction",
      "Mounting": "Side rail mounted",
      "Access": "Quick-release mechanism"
    }
  },

  "Winch Plate, Gooseneck Mounted": {
    title: "Gooseneck Winch Plate",
    description: "Heavy-duty mounting plate for winch installation on the gooseneck for pulling equipment onto the trailer.",
    benefits: [
      "Enables winch installation for loading assistance",
      "Heavy-duty mounting for high pull forces",
      "Gooseneck position provides optimal angle",
      "Compatible with most electric winches"
    ],
    specifications: {
      "Mounting": "Gooseneck frame",
      "Plate Thickness": "1/2 inch steel",
      "Winch Compatibility": "Standard 4-bolt pattern",
      "Pull Capacity": "Up to 12,000 lbs (winch dependent)"
    }
  },

  "Under Deck Storage Box": {
    title: "Under-Deck Storage Box",
    description: "Lockable storage compartment mounted under the trailer deck for tools, straps, and accessories.",
    benefits: [
      "Secure storage for tools and accessories",
      "Weather-resistant construction",
      "Lockable for security",
      "Doesn't reduce deck space",
      "Easy access from either side"
    ],
    specifications: {
      "Dimensions": "48\" x 18\" x 18\"",
      "Material": "Aluminum construction",
      "Lock": "Stainless steel paddle lock",
      "Mounting": "Under deck center"
    }
  },

  "D-Rings (⅝\") Each": {
    title: "Additional D-Rings",
    description: "Heavy-duty forged steel D-rings provide additional tie-down points for securing various types of cargo.",
    benefits: [
      "Additional tie-down points for flexibility",
      "Heavy-duty forged steel construction",
      "Recessed mounting protects from damage",
      "Compatible with chains, straps, and ropes"
    ],
    specifications: {
      "Size": "5/8 inch diameter",
      "Material": "Forged steel",
      "Working Load": "5,000 lbs",
      "Mounting": "Recessed in deck"
    }
  }
};

export function getOptionInfo(optionName: string): OptionInfo | null {
  return trailerOptionInfo[optionName] || null;
}