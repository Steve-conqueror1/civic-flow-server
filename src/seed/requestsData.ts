export const sampleRequests = [
  {
    title: "Large pothole on main road",
    description: "There is a deep pothole causing vehicles to swerve.",
    status: "open",
    aiSummary:
      "Citizen reported a dangerous pothole on a major road creating a traffic hazard.",
    location: {
      address: "Downtown Calgary, AB",
      lat: 51.0447,
      lng: -114.0719,
    },
    attachments: [
      "https://images.unsplash.com/photo-1560782205-4dd83ceb0270?q=80&w=1287&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    ],
  },
  {
    title: "Street snow not cleared",
    description: "Snow has not been cleared for two days.",
    status: "open",
    aiSummary:
      "Resident reports delayed snow removal causing unsafe driving conditions.",
    location: {
      address: "Downtown Edmonton, AB",
      lat: 53.5461,
      lng: -113.4938,
    },
    attachments: [
      "https://images.unsplash.com/photo-1610370720598-d0848a35d623?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      "https://plus.unsplash.com/premium_photo-1669042673428-9096b120ef3f?q=80&w=1364&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    ],
  },
  {
    title: "Missed garbage pickup",
    description: "Garbage was not collected this week.",
    status: "in_progress",
    aiSummary:
      "Garbage collection was missed for the reported address this week.",
    location: {
      address: "Red Deer City Centre, AB",
      lat: 52.2681,
      lng: -113.8112,
    },
    attachments: [
      "https://images.unsplash.com/photo-1605600659908-0ef719419d41?q=80&w=1336&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      "https://images.unsplash.com/photo-1721622248593-c24c83b830c7?q=80&w=2342&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    ],
  },
  {
    title: "Park bench broken",
    description: "Bench in the park is damaged and unsafe.",
    status: "in_progress",
    aiSummary:
      "Public park bench reported broken and potentially unsafe for visitors.",
    location: {
      address: "Lethbridge Downtown, AB",
      lat: 49.6956,
      lng: -112.8451,
    },
    attachments: [
      "https://images.unsplash.com/photo-1635785657417-2bf071cadb87?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      "https://images.unsplash.com/photo-1670219286484-179d3dd3d047?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    ],
  },
  {
    title: "Streetlight not working",
    description: "Streetlight flickers and turns off at night.",
    status: "in_progress",
    aiSummary:
      "Streetlight malfunction reported causing poor nighttime visibility.",
    location: {
      address: "Medicine Hat Downtown, AB",
      lat: 50.0405,
      lng: -110.6761,
    },
    attachments: [
      "https://plus.unsplash.com/premium_photo-1742452227427-a616a557ec23?q=80&w=2338&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      "https://images.unsplash.com/photo-1569619405872-2b522a707131?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    ],
  },
  {
    title: "Illegal dumping",
    description: "Someone dumped waste near the park entrance.",
    status: "resolved",
    aiSummary:
      "Illegal waste dumping reported near park entrance requiring cleanup.",
    location: {
      address: "Grande Prairie City Centre, AB",
      lat: 55.1707,
      lng: -118.7947,
    },
    attachments: [
      "https://images.unsplash.com/photo-1634763132965-ce94a16ae198?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      "https://plus.unsplash.com/premium_photo-1731174578639-0174480a5397?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    ],
  },
  {
    title: "Blocked storm drain",
    description: "Drain is clogged causing water buildup.",
    status: "rejected",
    aiSummary:
      "Storm drain blockage causing water accumulation reported by resident.",
    location: {
      address: "Airdrie Downtown, AB",
      lat: 51.2927,
      lng: -114.0144,
    },
    attachments: [
      "https://images.unsplash.com/photo-1740487018848-8f2b3e96342e?q=80&w=1335&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      "https://images.unsplash.com/photo-1740487018723-fc455293ca8e?q=80&w=1335&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    ],
  },
  {
    title: "Graffiti on public wall",
    description: "Graffiti appeared overnight on a municipal building.",
    status: "closed",
    aiSummary: "Graffiti vandalism reported on a municipal building wall.",
    location: {
      address: "St. Albert Downtown, AB",
      lat: 53.6303,
      lng: -113.6256,
    },
    attachments: [
      "https://images.unsplash.com/photo-1760120351661-abc8ec611732?q=80&w=2342&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      "https://images.unsplash.com/photo-1772197993169-13a6fa7722e3?q=80&w=2340&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    ],
  },
  {
    title: "Playground equipment damaged",
    description: "Swing set chain appears broken.",
    status: "pending_review",
    aiSummary:
      "Damaged playground equipment reported posing potential safety risk.",
    location: {
      address: "Sherwood Park Centre, AB",
      lat: 53.5168,
      lng: -113.3187,
    },
    attachments: [
      "https://images.unsplash.com/photo-1609258377718-6c71aff74212?q=80&w=2294&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      "https://images.unsplash.com/photo-1762672436240-f30fc30d89ee?q=80&w=1287&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    ],
  },
  {
    title: "Road sign knocked down",
    description: "Stop sign has been knocked down by a vehicle.",
    status: "under_review",
    aiSummary:
      "Traffic stop sign reported knocked down and requiring replacement.",
    location: {
      address: "Fort McMurray Downtown, AB",
      lat: 56.7264,
      lng: -111.379,
    },

    attachments: [
      "https://images.unsplash.com/photo-1622620645413-e427c12e03df?q=80&w=1287&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
      "https://images.unsplash.com/photo-1593505681742-8cbb6f44de25?q=80&w=2831&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    ],
  },
];
