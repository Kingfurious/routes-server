/**
 * Firebase Admin SDK – Insert Task Type Fields
 * Task: Dog Walk
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

// ---------- DATA PAYLOAD ----------
// const dogWalkFields = {
//   id: "dog_walk_fields",
//   taskTypeId: "dog_walk",
//   fields: [
//     {
//       fieldId: "dogSize",
//       label: "Dog Size",
//       type: "dropdown",
//       isRequired: true,
//       layout: { span: 12 },
//       options: [
//         { value: "small", label: "Small (12–25 lbs / 5.4–11.3 kg)" },
//         { value: "medium", label: "Medium (26–60 lbs / 11.8–27.2 kg)" },
//         { value: "large", label: "Large (60+ lbs / 27.2+ kg)" }
//       ]
//     },
//     {
//       fieldId: "dogTemperament",
//       label: "Dog Temperament",
//       type: "dropdown",
//       isRequired: true,
//       layout: { span: 12 },
//       options: [
//         { value: "calm", label: "Calm" },
//         { value: "energetic", label: "Energetic" },
//         { value: "aggressive", label: "Aggressive" }
//       ]
//     },
//     {
//       fieldId: "scheduledDate",
//       label: "Date",
//       type: "date",
//       isRequired: true,
//       layout: { span: 6 }
//     },
//     {
//       fieldId: "scheduledTime",
//       label: "Time",
//       type: "time",
//       isRequired: true,
//       layout: { span: 6 }
//     },
//     {
//       fieldId: "duration",
//       label: "Duration",
//       type: "dropdown",
//       isRequired: true,
//       layout: { span: 12 },
//       options: [
//         { value: 15, label: "15 mins" },
//         { value: 30, label: "30 mins" },
//         { value: 60, label: "60 mins" }
//       ]
//     },
//     {
//       fieldId: "pickupLocation",
//       label: "Pickup Location",
//       type: "text",
//       isRequired: true,
//       layout: { span: 12 },
//       placeholder: "eg. 123 Corner St."
//     },
//     {
//       fieldId: "preferredWalkLocation",
//       label: "Preferred Walk Location (Optional)",
//       type: "text",
//       isRequired: false,
//       layout: { span: 12 },
//       placeholder: "eg. Nearby park"
//     },
//     {
//       fieldId: "additionalNotes",
//       label: "Additional Notes",
//       type: "textarea",
//       isRequired: false,
//       layout: { span: 12 },
//       placeholder: "Enter a description..."
//     }
//   ],
//   createdAt: Date.now(),
//   updatedAt: Date.now()
// };

/**
 * Task: Scooping Cat Litter
 */

// const scoopingCatLitterFields = {
//   id: "scooping_cat_litter_fields",
//   taskTypeId: "scooping_cat_litter",
//   fields: [
//     {
//       fieldId: "numberOfLitterBoxes",
//       label: "Number of Litter Boxes",
//       type: "number",
//       isRequired: true,
//       layout: { span: 12 },
//       placeholder: "Enter number of litter boxes",
//       validation: {
//         min: 1,
//         max: 20
//       }
//     },
//     {
//       fieldId: "litterDisposalLocation",
//       label: "Litter Disposal Location",
//       type: "text",
//       isRequired: true,
//       layout: { span: 12 },
//       placeholder: "Where should the litter be disposed?"
//     },
//     {
//       fieldId: "scheduledDate",
//       label: "Date",
//       type: "date",
//       isRequired: true,
//       layout: { span: 6 }
//     },
//     {
//       fieldId: "scheduledTime",
//       label: "Time",
//       type: "time",
//       isRequired: true,
//       layout: { span: 6 }
//     },
//     {
//       fieldId: "location",
//       label: "Location",
//       type: "text",
//       isRequired: true,
//       layout: { span: 12 },
//       placeholder: "eg. 123 Corner St."
//     },
//     {
//       fieldId: "additionalNotes",
//       label: "Additional Notes",
//       type: "textarea",
//       isRequired: false,
//       layout: { span: 12 },
//       placeholder: "Enter a description..."
//     }
//   ],
//   createdAt: Date.now(),
//   updatedAt: Date.now()
// };

/**
 * Task: Replace Shower Liner
 */

// const replaceShowerLinerFields = {
//   id: "replace_shower_liner_fields",
//   taskTypeId: "replace_shower_liner",
//   fields: [
//     {
//       fieldId: "numberOfShowerLiners",
//       label: "No. of shower liners to be replaced",
//       type: "number",
//       isRequired: true,
//       layout: { span: 12 },
//       placeholder: "Enter number of shower liners",
//       validation: {
//         min: 1,
//         max: 10
//       }
//     },
//     {
//       fieldId: "scheduledDate",
//       label: "Date",
//       type: "date",
//       isRequired: true,
//       layout: { span: 6 }
//     },
//     {
//       fieldId: "scheduledTime",
//       label: "Time",
//       type: "time",
//       isRequired: true,
//       layout: { span: 6 }
//     },
//     {
//       fieldId: "location",
//       label: "Location",
//       type: "text",
//       isRequired: true,
//       layout: { span: 12 },
//       placeholder: "eg. 123 Corner St."
//     },
//     {
//       fieldId: "additionalNotes",
//       label: "Additional Notes",
//       type: "textarea",
//       isRequired: false,
//       layout: { span: 12 },
//       placeholder: "Enter a description..."
//     },
//     {
//       fieldId: "referencePhoto",
//       label: "Upload a Photo (Optional)",
//       type: "image",
//       isRequired: false,
//       layout: { span: 12 },
//       upload: {
//         maxFiles: 1,
//         allowedTypes: ["image/jpeg", "image/png"],
//         maxSizeMB: 5
//       }
//     }
//   ],
//   createdAt: Date.now(),
//   updatedAt: Date.now()
// };

/**
 * Task: Sweep Porch/Patio
 */

const sweepPorchPatioFields = {
  id: "sweep_porch_patio_fields",
  taskTypeId: "sweep_porch_patio",
  fields: [
    {
      fieldId: "areaSize",
      label: "Area Size",
      type: "select",
      isRequired: true,
      layout: { span: 12 },
      options: [
        { label: "Small (0–10 sqm)", value: "small" },
        { label: "Medium (10–30 sqm)", value: "medium" },
        { label: "Large (30+ sqm)", value: "large" }
      ]
    },
    {
      fieldId: "scheduledDate",
      label: "Date",
      type: "date",
      isRequired: true,
      layout: { span: 6 }
    },
    {
      fieldId: "scheduledTime",
      label: "Time",
      type: "time",
      isRequired: true,
      layout: { span: 6 }
    },
    {
      fieldId: "location",
      label: "Location",
      type: "text",
      isRequired: true,
      layout: { span: 12 },
      placeholder: "eg. 123 Corner St."
    },
    {
      fieldId: "additionalNotes",
      label: "Additional Notes",
      type: "textarea",
      isRequired: false,
      layout: { span: 12 },
      placeholder: "Enter a description..."
    },
    {
      fieldId: "referencePhoto",
      label: "Upload a Photo (Optional)",
      type: "image",
      isRequired: false,
      layout: { span: 12 },
      upload: {
        maxFiles: 1,
        allowedTypes: ["image/jpeg", "image/png"],
        maxSizeMB: 5
      }
    }
  ],
  createdAt: Date.now(),
  updatedAt: Date.now()
};

/**
 * Task: Wipe Outdoor Furniture
 */

const wipeOutdoorFurnitureFields = {
  id: "wipe_outdoor_furniture_fields",
  taskTypeId: "wipe_outdoor_furniture",
  fields: [
    {
      fieldId: "numberOfFurnitures",
      label: "No. of furnitures",
      type: "number",
      isRequired: true,
      layout: { span: 12 },
      placeholder: "Enter number of furnitures",
      validation: {
        min: 1,
        max: 20
      }
    },
    {
      fieldId: "scheduledDate",
      label: "Date",
      type: "date",
      isRequired: true,
      layout: { span: 6 }
    },
    {
      fieldId: "scheduledTime",
      label: "Time",
      type: "time",
      isRequired: true,
      layout: { span: 6 }
    },
    {
      fieldId: "location",
      label: "Location",
      type: "text",
      isRequired: true,
      layout: { span: 12 },
      placeholder: "eg. 123 Corner St."
    },
    {
      fieldId: "additionalNotes",
      label: "Additional Notes",
      type: "textarea",
      isRequired: false,
      layout: { span: 12 },
      placeholder: "Enter a description..."
    },
    {
      fieldId: "referencePhoto",
      label: "Upload a Photo (Optional)",
      type: "image",
      isRequired: false,
      layout: { span: 12 },
      upload: {
        maxFiles: 1,
        allowedTypes: ["image/jpeg", "image/png"],
        maxSizeMB: 5
      }
    }
  ],
  createdAt: Date.now(),
  updatedAt: Date.now()
};

// ---------- WRITE TO FIRESTORE ----------
async function insertDogWalkFields() {
  try {
    const ref = db
      .collection("task_type_fields")
      .doc("wipe_outdoor_furniture_fields");

    await ref.set(wipeOutdoorFurnitureFields, { merge: true });

    console.log("✅ Wipe Outdoor Furniture fields successfully inserted/updated");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error inserting Dog Walk fields:", error);
    process.exit(1);
  }
}

insertDogWalkFields();
