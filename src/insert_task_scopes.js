/**
 * Firebase Admin SDK – Insert Task Type Scopes
 * One-time script to update task_types collection with scope information
 * (included/not included items) for all task types
 */

import admin from "firebase-admin";
import fs from "fs";

// ---------- INIT FIREBASE ----------
const serviceAccount = JSON.parse(
  fs.readFileSync("/home/mahesh/Projects/GitHub/errunds-backend/src/services.json", "utf8")
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// ---------- TASK SCOPE DATA ----------
const taskScopes = [
  {
    taskTypeId: "fold_laundry",
    taskName: "Folding Clean Laundry",
    included: [
      "Folding clean, dry clothes",
      "Sorting by type or owner",
      "Folding towels, bedding, and garments"
    ],
    notIncluded: [
      "Washing or drying laundry",
      "Ironing or steaming",
      "Hanging or putting clothes away"
    ]
  },
  {
    taskTypeId: "sweep_floors",
    taskName: "Sweeping Floors",
    included: [
      "Sweeping hard floors",
      "Collecting dust and debris"
    ],
    notIncluded: [
      "Mopping or wet cleaning",
      "Moving heavy furniture",
      "Cleaning carpets or rugs"
    ]
  },
  {
    taskTypeId: "vacuum_floors",
    taskName: "Vacuuming Carpets and/or Floors",
    included: [
      "Vacuuming carpets and rugs",
      "Vacuuming hard floors"
    ],
    notIncluded: [
      "Shampooing or deep cleaning",
      "Moving heavy furniture",
      "Cleaning upholstery"
    ]
  },
  {
    taskTypeId: "empty_wastebaskets",
    taskName: "Emptying Wastebaskets",
    included: [
      "Emptying household wastebaskets",
      "Replacing trash bags",
      "Moving trash to designated indoor bin"
    ],
    notIncluded: [
      "Sorting recyclables",
      "Cleaning or washing bins",
      "Handling hazardous waste"
    ]
  },
  {
    taskTypeId: "replace_shower_liner",
    taskName: "Replacing Shower Curtain Liner",
    included: [
      "Removing old liner",
      "Installing new liner provided by customer"
    ],
    notIncluded: [
      "Purchasing the liner",
      "Cleaning the shower or curtain rod",
      "Repairing rods or hooks"
    ]
  },
  {
    taskTypeId: "move_bins_curb",
    taskName: "Bringing Bins To/From Curb",
    included: [
      "Moving bins to curb for pickup",
      "Returning bins after pickup"
    ],
    notIncluded: [
      "Cleaning bins",
      "Sorting trash or recyclables",
      "Handling oversized or hazardous waste"
    ]
  },
  {
    taskTypeId: "sweep_porch_patio",
    taskName: "Sweeping Porch / Patio",
    included: [
      "Sweeping outdoor surfaces",
      "Collecting leaves and debris"
    ],
    notIncluded: [
      "Power washing",
      "Scrubbing stains",
      "Yard or landscaping work"
    ]
  },
  {
    taskTypeId: "wipe_outdoor_furniture",
    taskName: "Wiping Outdoor Furniture",
    included: [
      "Wiping surfaces of outdoor furniture",
      "Removing dust and light dirt"
    ],
    notIncluded: [
      "Deep cleaning or pressure washing",
      "Furniture repair or refinishing",
      "Moving heavy furniture"
    ]
  },
  {
    taskTypeId: "dog_walk",
    taskName: "Short Dog Walk",
    included: [
      "Walking one dog (max 45 mins)",
      "Picking up and disposing of poop"
    ],
    notIncluded: [
      "Training or behavior correction",
      "Bathing or grooming",
      "Handling aggressive dogs"
    ]
  },
  {
    taskTypeId: "scooping_cat_litter",
    taskName: "Scooping Cat Litter",
    included: [
      "Scooping used litter",
      "Disposing of waste properly"
    ],
    notIncluded: [
      "Full litter replacement",
      "Cleaning or washing litter box",
      "Supplying litter"
    ]
  },
  {
    taskTypeId: "groceries",
    taskName: "Picking Up Prepaid Groceries",
    included: [
      "Picking up prepaid grocery orders",
      "Delivering to customer location"
    ],
    notIncluded: [
      "Paying for items",
      "Shopping for missing items",
      "Unloading or storing groceries"
    ]
  },
  {
    taskTypeId: "return_library_books",
    taskName: "Returning Library Books",
    included: [
      "Returning books to library drop-off"
    ],
    notIncluded: [
      "Paying late fees",
      "Borrowing or renewing items",
      "Handling fines or disputes"
    ]
  },
  {
    taskTypeId: "pharmacy_items",
    taskName: "Pharmacy Pickup",
    included: [
      "Picking up prepaid prescriptions",
      "Delivering to customer"
    ],
    notIncluded: [
      "Paying for medications",
      "Controlled substances",
      "Medical consultation"
    ]
  },
  {
    taskTypeId: "dry_cleaning",
    taskName: "Picking Up / Dropping Off Dry Cleaning (Prepaid)",
    included: [
      "Picking up prepaid dry cleaning",
      "Dropping off prepaid dry cleaning"
    ],
    notIncluded: [
      "Paying for services",
      "Inspecting or repairing garments",
      "Storing or organizing clothes"
    ]
  },
  {
    taskTypeId: "pickup_lunch_box",
    taskName: "Pickup Forgotten Lunch Box",
    included: [
      "Picking up lunch box",
      "Delivering to specified location"
    ],
    notIncluded: [
      "Purchasing food",
      "Food preparation",
      "Handling special dietary requests"
    ]
  },
  {
    taskTypeId: "pickup_charger",
    taskName: "Pickup Forgotten Charger",
    included: [
      "Picking up chargers",
      "Delivering chargers safely"
    ],
    notIncluded: [
      "Purchasing chargers",
      "Testing device compatibility",
      "Installation or setup"
    ]
  },
  {
    taskTypeId: "recycle_materials",
    taskName: "Dropping Off Recycled Materials",
    included: [
      "Transporting sorted recyclables",
      "Dropping off at recycling center"
    ],
    notIncluded: [
      "Sorting recyclables",
      "Cleaning recyclable items",
      "Handling hazardous waste"
    ]
  },
  {
    taskTypeId: "basic_car_wash",
    taskName: "Car Wash (Exterior Only)",
    included: [
      "Exterior car wash",
      "Rinsing and drying exterior surfaces"
    ],
    notIncluded: [
      "Interior cleaning",
      "Waxing or detailing",
      "Engine or undercarriage cleaning"
    ]
  },
  {
    taskTypeId: "car_interior_vacuuming",
    taskName: "Car Interior Vacuuming",
    included: [
      "Vacuuming seats, carpets, and floor mats"
    ],
    notIncluded: [
      "Deep detailing",
      "Stain removal",
      "Dashboard or surface wiping"
    ]
  }
];

// ---------- WRITE TO FIRESTORE ----------
async function insertTaskScopes() {
  try {
    let count = 0;
    let notFound = [];

    for (const scope of taskScopes) {
      const docRef = db.collection("task_types").doc(scope.taskTypeId);
      
      // Check if document exists
      const docSnapshot = await docRef.get();
      
      if (!docSnapshot.exists) {
        notFound.push(scope.taskTypeId);
        console.warn(`⚠️  Warning: Task type "${scope.taskTypeId}" not found in task_types collection. Skipping...`);
        continue;
      }

      // Prepare scope data to merge with existing document
      const scopeData = {
        scope: {
          included: scope.included,
          notIncluded: scope.notIncluded
        },
        updatedAt: admin.firestore.Timestamp.now()
      };

      // Update document with merge to preserve existing fields
      await docRef.set(scopeData, { merge: true });
      console.log(`✓ Updated: ${scope.taskTypeId}`);
      count++;
    }

    console.log(`\n✅ Successfully updated ${count} task type documents with scope information`);
    console.log(`📁 Collection: task_types`);
    
    if (notFound.length > 0) {
      console.log(`\n⚠️  The following task types were not found and skipped:`);
      notFound.forEach(id => console.log(`   - ${id}`));
    }
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error updating task scopes:", error);
    process.exit(1);
  }
}

insertTaskScopes();
