import type { Market } from "./mock-data";

export type ImportedScheduleOverride = {
  userId: string;
  market: Market;
  date: string;
  members?: string[];
  projectCode?: string;
  adpNumber?: string;
  siteAddress?: string;
  scopeOfWork?: string;
  approvedOnsite?: string;
  shift?: string;
  daysRemaining?: number;
  hoursRemaining?: number;
  specialInstructions?: string;
};

export const importedScheduleOverrides: ImportedScheduleOverride[] = [
  {
    userId: "u8",
    market: "socal",
    date: "2026-05-08",
    members: ["Albert Torres"],
    projectCode: "LA Warehouse",
    adpNumber: "6858",
    scopeOfWork:
      "Be at the LA shop at 6:30am. Line up the guys for the deliveries and pick-ups. Site LA0248 is starting get EPL & BOM delivered to the site. Grab the other items and deliver to the site. Help the crew offload and stage materials. Once done head back to the shop and continue working on decom equipment. Follow up on the pending submittals with Talley's. Reach out to Jacob about his needed materials.",
  },
  {
    userId: "u9",
    market: "socal",
    date: "2026-05-08",
    members: ["Michael Tanseco"],
    projectCode: "LA Warehouse",
    adpNumber: "6858",
    scopeOfWork:
      "Be at the shop at 6am. Open up the shop and get the trucks out. Site CSL01724 is starting deliver out EPL & BOM. Take anything else that is needed to the site. Help the crew offload. Once done head back to the shop and continue working in the shop. Do the dump trailer inspections. Make sure the trucks are ready for the next day.",
  },
  {
    userId: "u27",
    market: "socal",
    date: "2026-05-08",
    members: ["Manlio Imperial", "Johnathan Velazquez", "Eddie Serrano"],
    projectCode: "ERA - 603 - SBV110",
    adpNumber: "6953",
    siteAddress: "50 W. Hillcrest Drive, Thousand Oaks, CA 91360",
    scopeOfWork:
      "Get logged in with E// United, NFSD.\nWork on getting the DCPP anchored inside the shelter, Prepping out for the relocation of all cabling to the new DCPP. Warehouse is working on your needed materials and will deliver them out Tuesday. I have the lift scheduled to be delivered Thursday so let Albert know what you will need for anchor straps and SRL to get the trunks ran safely. They will also deliver out the materials needed to complete the RF sap. Get all the signs and barriers installed, photos taken and submitted into Rowena for review and get any additional photos if requested by her. Up top continue to install the new carriers",
    approvedOnsite: "7:30AM - 3:000PM\nMCA",
    daysRemaining: 13,
  },
  {
    userId: "u15",
    market: "socal",
    date: "2026-05-08",
    members: ["Steven Rodriguez", "Fred Galindo"],
    projectCode: "ERA - 603 - LAC117",
    adpNumber: "6914",
    siteAddress: "454 WEST LOS ANGELES AVENUE, SOMIS, CA, 93066",
    scopeOfWork:
      "Get logged in with E// United, NFSD & Crown Castle. Send me screenshot once logged in. Make sure to text Kevin too with your safety setup.\nContinue to get the battery cabinet all wired up. Get your 4/0 landed at both ends. Keep in mind to land at the battery cabinet side first because the DCPP buss side is hot at all times. Support all conduits down below. Get your labels installed in both cabinets. Label the batteries. Up top continue to support all cabling. I am still waiting to hear back from RF regarding the issues with azimuths on Beta and Gamma. I will follow up again Monday AM.",
    approvedOnsite: "6:00AM - 2:30PM\nMCA",
    specialInstructions: "Tower owner: Crown Castle",
    daysRemaining: 5,
  },
  {
    userId: "u32",
    market: "socal",
    date: "2026-05-08",
    members: ["Craig Brown", "Will Bell"],
    projectCode: "ERA - 603 - CSL01724",
    adpNumber: "6937",
    siteAddress: "7535 Santa Susana Pass Road Santa Susana CA.93063",
    scopeOfWork:
      "Get logged in with E// United, NFSD, & Crown Castle. Text the CC CM and send over photos to me once logged in.\nCXS site. Materials will be delivered out on Monday. Get all materials staged, inventoried, and organized. Scan in all assets. Begin to label all equipment and send in photos. Complete the RF sap and submit into Rowena. Schedule an initial VSS. Scaffolding is scheduled to be installed Tuesday inside the tower to access the antennas and radios.",
    approvedOnsite: "6:00AM - 2:30PM\nMCA",
    specialInstructions: "Tower owner: Crown Castle",
    daysRemaining: 8,
  },
  {
    userId: "u51",
    market: "socal",
    date: "2026-05-08",
    members: ["Alfonso Velazquez", "Fernando Gomez"],
    projectCode: "ERT - 250 - LA02866D",
    adpNumber: "6974",
    siteAddress: "2270 Rosecrans Ave, Fullerton, CA 92833",
    scopeOfWork: "Check SD for notes",
    approvedOnsite: "7:00AM - 3:30PM\nMCA",
    specialInstructions: "Tower owner: Crown Castle",
    daysRemaining: 15,
  },
  {
    userId: "u47",
    market: "socal",
    date: "2026-05-08",
    members: ["Jacob Apodaca", "Ernesto Velasquez"],
    projectCode: "ERA - 602 - LAC082",
    adpNumber: "6916",
    siteAddress: "9355 STEWART AND GRAY ROAD , DOWNEY, CA 90241",
    scopeOfWork:
      "Get logged in with E// United, NFSD & Crown Castle. Text me when you get logged into Crown.\nFinish up clearing the remaining alarms onsite so we can receive the ROC for the newly installed carriers. Finish up any remaining supports at the sectors for all powers, fibers, grounds, and RF jumpers. Send in your T6 photos so Rowena can upload them to remote access and get your progress/final VSS scheduled.",
    approvedOnsite: "6:30AM - 3:00PM\nMCA",
    specialInstructions: "Tower owner: Crown Castle",
    daysRemaining: 2,
  },
  {
    userId: "u34",
    market: "socal",
    date: "2026-05-08",
    members: ["Victor Martinez", "Federico Castillo"],
    projectCode: "ERA - 602 - LAC309",
    adpNumber: "6920",
    siteAddress: "7439 COLDWATER CANYON BAY D, NORTH HOLLYWOOD, CA 91605",
    scopeOfWork:
      "Get logged in with E// United, NFSD & Octagon.\nComplete your final VSS at the scheduled time and correct any punch items, submit them into the team. Get the site cleaned up on the scaffolding and in the shelter. Let Albert know if you need a final site cleanup. Scaffolding crew might be there on Monday afternoon to take down the top tier, if not it will be Tuesday.",
    approvedOnsite: "7:30AM - 4:00PM\nMCA",
    specialInstructions: "Tower owner: Octagon Towers",
    daysRemaining: 2,
  },
  {
    userId: "u23",
    market: "socal",
    date: "2026-05-08",
    members: ["Blake Devore", "David Cortez"],
    projectCode: "ERA - 601 - OC0011",
    adpNumber: "6913",
    siteAddress: "3151 N. Euclid St. Fullerton CA. 92833",
    scopeOfWork:
      "Get logged in with E// United, NFSD, and Phoenix towers\nCXC site. Finish up the remaining supports at all 3 sectors. Complete your final VSS and correct any punch items. Ensure Rowena has all COP and they are approved. Take all final photos on the tower and in the shelter. Install the wraps and socks on the air antennas. Clean up the shelter and tower with no materials left behind. Re-install branches. Once all cleared with the VSS drive the lift down the hill and park outside the gate in the dirt to the right.",
    approvedOnsite: "6:00AM - 2:30PM\nMCA",
    specialInstructions: "Tower owner: Phoenix Towers",
    hoursRemaining: 90,
  },
  {
    userId: "u36",
    market: "socal",
    date: "2026-05-08",
    members: ["Ricky Torres", "Kyle Reno"],
    projectCode: "ERA - 504 - LAC448",
    adpNumber: "5724",
    siteAddress: "3333 WEST COAST HIGHWAY #520, NEWPORT BEACH, CA 92663",
    scopeOfWork:
      "Get logged in with E// United & NFSD.\nContinue wiring up your telco flex at the DC12 and the DCPP. Get your AC ran from the AC panel to the DCPP and get those landed at both ends. Run the conduits from the DCPP to the Purcell and run your #2 and alarm wires. Get the 3/0 ran from the AC panel to the meter and have it ready to be cutover. Run a mule tape in the transport conduit so when we do the cutover it's all ready to go.",
    approvedOnsite: "6:00AM - 2:30PM\nMCA",
    daysRemaining: 5,
  },
  {
    userId: "u30",
    market: "socal",
    date: "2026-05-08",
    members: ["Hosea Weathers"],
    projectCode: "AMA - 100 - CLL00074",
    adpNumber: "6880",
    siteAddress: "901 Via San Clemente Montebello, Ca 90640",
    scopeOfWork:
      "Log in with Pathwaves and create the JHA (Call D. McClellan for CLL00074)\nIX team will be onsite around 7 or 8am. Swing by the shop and grab the 60' of telco flex and the 5amp breaker Alberto set aside. Grab some SFP cards for the Radios as well. The radios are 4490, 4449, 4890, C-Band and DOD. Then head to the site. Lock combo is 1002. No need to log in with Phoenix Towers. Pull the telco flex from the DCPP over to the 6x6 outdoor box next to the 36x36 telco box and Cienna. Goal is to remove the solar power for the Ciena and put it on -48VDC perm power from the WUC DCPP. Label the breaker. Duct seal all the conduits in the 36x36 telco box. Stuff rags and cardboard into the 4\" to prevent the duct seal from falling into the conduit. Send me voltage reading picture at the small breaker in the 6x6 box, label picture at the DCPP and picture of the conduits sealed a the 36x36 telco box. Once power is completed work with the integrator to get the port configuration for the BBU's. Once he is squared away and comfortable you can head to site LAC294. Call me before leaving and call me if the IX team is not there by 8am. \n\nGet logged in with E// United, NFSD & Crown Castle. Text me a photo of your login.\nRamon started this site on Friday. Materials have been delivered. Review the DCPP and the -58v conversion. See what we need to move over to -48 to free up the slots to complete the conversion. Scaffolding is scheduled to be setup here on Tuesday to access the tower.",
    approvedOnsite: "6:00AM - 2:30PM\nMCA",
    specialInstructions: "Tower owner: Crown Castle",
    daysRemaining: 13,
  },
  {
    userId: "u31",
    market: "socal",
    date: "2026-05-08",
    members: ["Gregory Davila"],
    projectCode: "ERA - 602 - LAC294",
    adpNumber: "6793",
    siteAddress: "15707 Imperial HWY La Mirada CA. 90638",
  },
  {
    userId: "u38",
    market: "socal",
    date: "2026-05-08",
    members: ["Ramon Ojeda", "Eric Hukel"],
    projectCode: "ERA - 602 - LA0248",
    adpNumber: "6491",
    siteAddress: "20633 SNOW CREEK PARK ROAD , WALNUT, CA 91789",
    scopeOfWork:
      "Get logged in with E// United, NFSD.\nCXS site. We will deliver out the materials to you in the morning along with the tri-pod and gas monitor to access the vault. Receive the materials, inventory, scan in the assets and organize in the vault. Send me photos of the tri-pod and gas monitor setup so we can send it over to E// as they are requesting it. Begin to remove the old UMTS cabinet to make room for the battery cabinet. Review the CDs/RFDS so we know where to put the new radios in the vault.",
    approvedOnsite: "6:00AM - 2:30PM\nMCA",
    daysRemaining: 12,
  },
  {
    userId: "u12",
    market: "socal",
    date: "2026-05-08",
    members: ["Jason Andrews"],
    projectCode: "ERA - 100 - CAL02220",
    adpNumber: "6929",
    siteAddress: "940 Hilltop Drive Chula Vista, Ca 91911",
    scopeOfWork:
      "Meet onsite at 7am. Log in with Ericsson United Tool\nWe will get the Mini-X onsite on Monday and C. Tepox will bring the dump trailer.\nBig focus is getting Telco Ready by Friday if possible. I will work on pushing it out on Mondays call. Start digging for the new Hand Hole. Make it level with the side walk. Start trench for your telco from the new pull box. Load up the dump trailer with all the trees and shrubs. We will find a dump out there. House Clean. CW will return on Thursday and Friday to complete their work. Call Don if you need anything.\nChristian and Freddy - Plan on staying in SD for the week. I will load the Dash card with per diem and send the hotel info over in the afternoon.",
    approvedOnsite: "7:00AM - 5:30PM\nCivil-RF",
    specialInstructions: "Tower owner: AT&T\nNo-Tower Owner Log in Required",
    daysRemaining: 80,
  },
  {
    userId: "u13",
    market: "socal",
    date: "2026-05-08",
    members: ["Christian Tepox", "Freddy Tepox"],
  },
  {
    userId: "u18",
    market: "socal",
    date: "2026-05-08",
    members: ["Miguel Soberano", "Michael Hernandez", "Obrien Paniagua"],
    projectCode: "JAC - 100 - CSL05488",
    adpNumber: "6725",
    siteAddress: "4350 La Sierra Ave. Riverside, CA 92501",
    scopeOfWork:
      "Meet on Site @7:00am Log in with Path waves, ECsite and the NFSD\nContinue installing the tower branches. Use the tower branch map to install the branches properly. Once all branches installed get me some tower overall pictures. Install antenna socks and wraps as needed.",
    approvedOnsite: "7:00AM - 4:30PM\nRF",
    specialInstructions: "Tower owner: AT&T\nNo-Tower Owner Log in Required",
    daysRemaining: 1,
  },
  {
    userId: "u24",
    market: "socal",
    date: "2026-05-08",
    members: ["Scott Devore", "Cesar Gonzalez", "Guillermo Alvizo"],
    projectCode: "ERA - 100 - CAL01938",
    adpNumber: "6613",
    siteAddress: "3770A Altadena Ave, San Diego CA. 92105",
    scopeOfWork:
      "Meet Onsite at 7am. log in with Ericsson tool and create the JHA.\nThe Shims Jason ordered are ready and will be delivered ASAP. Once delivered install the shims as needed. Follow up with Tony from SD warehouse for the 8 - 25' HMHM jumpers that were handed off to him on Friday. Pull the fiber trunks and get them ready to land into the DC09. Install the DC09 at each sector. Start hanging the new radios on all the sectors. Install the site grounds and MGB's at all sectors. Get the power/fiber trunks landed and install at the DC09 and DC50's. Run the main #2 ground from the shelter MGB up to Beta sector MGB, then daisy chain Alpha and Gamma sectors. Ground one piece of steel angle per sector as well. Once all radios and hung and the ground system is completed move onto running the RRU power/fiber and RF jumpers.",
    approvedOnsite: "7:00AM - 5:00PM\nCivil & RF",
    specialInstructions: "Tower owner: AT&T\nNo-Tower Owner Log in Required",
    daysRemaining: 30,
  },
  {
    userId: "u26",
    market: "socal",
    date: "2026-05-08",
    members: ["Richard Romero"],
    projectCode: "LA Warehouse",
    adpNumber: "6858",
    siteAddress: "12603 Allard Street, Santa Fe Springs, CA 90670",
    scopeOfWork:
      "Meet at the LA warehouse at 7:30am. Talk with Alberto or Michael for duties. Adhere to your restrictions and 10 minute breaks every hour. No bending. Work on vacuuming the office. Sweeping, dusting and cleaning the bathroom toilets and sinks. Make sure to sit down on a chair while cleaning the bathroom. Use the spare computer if needed and work on your NWSA Training",
    approvedOnsite: "7:00AM - 3:30PM\nRestricted",
    daysRemaining: 5,
  },
  {
    userId: "u46",
    market: "socal",
    date: "2026-05-08",
    members: ["David Orozco", "Miguel Soberano Jr."],
    siteAddress: "OFF",
    scopeOfWork: "PTO Returning 4/22",
  },
];
