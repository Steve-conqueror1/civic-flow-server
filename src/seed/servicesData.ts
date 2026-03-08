export const servicesData = [
  {
    name: "Road Repair Request",
    slug: "road-repair-request",
    description:
      "Report potholes, damaged roads, or street maintenance issues.",
    instructions:
      "Provide the exact road location and describe the damage if possible.",
    categorySlug: "infrastructure",
    departmentSlug: "roads-traffic",
    minResponseDays: 2,
    maxResponseDays: 3,
  },
  {
    name: "Snow Removal Status",
    slug: "snow-removal-status",
    description: "Check or report snow removal and street plowing updates.",
    instructions:
      "Submit the street name and area where snow removal is required.",
    categorySlug: "infrastructure",
    departmentSlug: "roads-traffic",
    minResponseDays: 1,
    maxResponseDays: 2,
  },

  {
    name: "Business License Application",
    slug: "business-license-application",
    description: "Apply for or renew a municipal business license.",
    instructions:
      "Attach required business registration documents when submitting.",
    categorySlug: "permits-licensing",
    departmentSlug: "permits",
    minResponseDays: 5,
    maxResponseDays: 7,
  },
  {
    name: "Building Permit Status",
    slug: "building-permit-status",
    description: "Track the approval status of a building permit application.",
    instructions:
      "Provide your permit reference number to check the application status.",
    categorySlug: "permits-licensing",
    departmentSlug: "permits",
    minResponseDays: 3,
    maxResponseDays: 5,
  },

  {
    name: "Housing Support Application",
    slug: "housing-support-application",
    description: "Apply for municipal housing assistance or rental support.",
    instructions:
      "Include proof of residence and income documentation if required.",
    categorySlug: "social-programs",
    departmentSlug: "social-services",
    minResponseDays: 7,
    maxResponseDays: 10,
  },
  {
    name: "Child Care Subsidy",
    slug: "child-care-subsidy",
    description: "Apply for financial assistance for child care services.",
    instructions:
      "Submit child care provider details and proof of eligibility.",
    categorySlug: "social-programs",
    departmentSlug: "social-services",
    minResponseDays: 5,
    maxResponseDays: 7,
  },

  {
    name: "Non-emergency Reporting",
    slug: "non-emergency-reporting",
    description: "Report non-urgent safety concerns in the community.",
    instructions:
      "Provide location details and describe the situation clearly.",
    categorySlug: "public-safety",
    departmentSlug: "general-help",
    minResponseDays: 1,
    maxResponseDays: 2,
  },
  {
    name: "Fire Permits",
    slug: "fire-permits",
    description: "Apply for fire-related permits for events or activities.",
    instructions: "Specify event date, location, and fire safety precautions.",
    categorySlug: "public-safety",
    departmentSlug: "permits",
    minResponseDays: 3,
    maxResponseDays: 4,
  },

  {
    name: "Waste Collection Schedule",
    slug: "waste-collection-schedule",
    description: "View waste pickup schedules or report missed collections.",
    instructions:
      "Provide your address to check the waste collection schedule.",
    categorySlug: "environment",
    departmentSlug: "waste-mgmt",
    minResponseDays: 1,
    maxResponseDays: 2,
  },
  {
    name: "Park Facility Booking",
    slug: "park-facility-booking",
    description:
      "Reserve park facilities such as picnic areas or sports fields.",
    instructions: "Choose the park location and preferred booking date.",
    categorySlug: "environment",
    departmentSlug: "parks-rec",
    minResponseDays: 2,
    maxResponseDays: 3,
  },
];
