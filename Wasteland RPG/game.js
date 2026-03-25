/* ============================================================
   WASTELAND RPG — EXTENDED VERSION WITH:
   - Weapon equipping + rarity scaling
   - Armor equipping + defense + rarity scaling
   - Enemies drop armor
   - Sound effects
   - Ally rarity system
   - Rarity colors
   - Random ally availability
   - Ally cost display
   - Ally limit scales with level
   - Rarity-based stat boosts
   - Dedicated ALLIES tab
   - Item quantities
   - New enemies: Feral Ghoul, Deathclaw, Mothman
   - Location-based events
   - Caps Frenzy (100 seconds)
   - Ally name combat messages (A1)
   - XP + Leveling system
   - LocalStorage integration
   - Shops in certain locations
   - Selling items + allies
   - Crafting + scrap usage
   - Faster enemy spawns + extra Stimpak chance
   ============================================================ */

/* ---------------------------
   SOUND ENGINE
--------------------------- */
const SFX = {
  click: new Audio("sounds/click.wav"),
  attack: new Audio("sounds/attack.wav"),
  enemyHit: new Audio("sounds/enemy_hit.wav"),
  loot: new Audio("sounds/loot.wav"),
  travel: new Audio("sounds/travel.wav"),
  recruit: new Audio("sounds/recruit.wav"),
  pipOpen: new Audio("sounds/pipboy_open.wav"),
  pipNav: new Audio("sounds/pipboy_nav.wav")
};

Object.values(SFX).forEach(s => s.volume = 0.4);
window.addEventListener("load", () => SFX.pipOpen.play());

/* ---------------------------
   RARITY COLORS
--------------------------- */
const RARITY_COLORS = {
  "Common": "#9e9e9e",
  "Uncommon": "#4caf50",
  "Rare": "#2196f3",
  "Legendary": "#ff9800"
};

/* ---------------------------
   RARITY MULTIPLIERS
--------------------------- */
const RARITY_WEAPON_MULTIPLIER = {
  "Common": 1.0,
  "Uncommon": 1.2,
  "Rare": 1.5,
  "Legendary": 2.0
};

const RARITY_ARMOR_MULTIPLIER = {
  "Common": 1.0,
  "Uncommon": 1.3,
  "Rare": 1.6,
  "Legendary": 2.0
};

/* ---------------------------
   GAME STATE
--------------------------- */
const gameState = {
  player: {
    name: "Vault Wanderer",
    level: 1,
    xp: 0,
    xpToNext: 100,
    hp: 30,
    maxHp: 30,
    ap: 10,
    caps: 50,
    location: "Vault Ruins",
    state: "West Virginia",
    stats: { str: 5, per: 5, end: 5, lck: 5 },
    inventory: [
      { id: 1, name: "Rusty Pistol", type: "weapon", damage: 5, rarity: "Common", equipped: true, quantity: 1 },
      { id: 2, name: "Stimpak", type: "consumable", heal: 15, quantity: 2 },
      { id: 3, name: "Leather Armor", type: "armor", hpBoost: 10, defense: 2, rarity: "Common", equipped: false, quantity: 1 }
    ],
    allies: []
  },

  states: {
    "West Virginia": [
      { id: "vault", name: "Vault Ruins", danger: "Low" },
      { id: "burning", name: "Burning Springs", danger: "High" },
      { id: "highway", name: "Highway Town", danger: "Medium" }
    ],
    "Pennsylvania": [
      { id: "pitt", name: "The Pitt Outskirts", danger: "High" },
      { id: "coal", name: "Coal Ridge Mine", danger: "Medium" }
    ],
    "Ohio": [
      { id: "toledo", name: "Toledo Wastes", danger: "Medium" },
      { id: "vault_19", name: "Vault 19", danger: "Low" }
    ],
    "Maryland": [
      { id: "dc", name: "Ruins of DC", danger: "High" },
      { id: "lucy_crossing", name: "Lucy’s Crossing", danger: "Low" }
    ],
    "California": [
      { id: "ncr", name: "NCR Stronghold", danger: "Medium" },
      { id: "vegas", name: "New Vegas Strip", danger: "High" },
      { id: "vault_33", name: "Vault 33", danger: "Low" }
    ]
  },

  recruitableAllies: [
    { name: "Vault Dweller", cost: 30, damage: 4, hp: 20, rarity: "Uncommon", boost: 1 },
    { name: "Settler", cost: 20, damage: 2, hp: 15, rarity: "Common", boost: 0 },
    { name: "Power Armor Soldier", cost: 100, damage: 10, hp: 40, rarity: "Rare", boost: 2 },
    { name: "The Ghoul", cost: 50, damage: 6, hp: 25, rarity: "Legendary", boost: 3 },
    { name: "Lucy MacLean", cost: 75, damage: 8, hp: 30, rarity: "Legendary", boost: 3 },
    { name: "NCR Trooper", cost: 60, damage: 7, hp: 30, rarity: "Rare", boost: 2 }
  ],

  enemy: null,
  selectedState: "West Virginia",
  selectedLocationId: "vault",
  selectedInventoryItemId: null,
  availableAlly: null,

  events: {
    capsFrenzyActive: false,
    capsFrenzyTimer: 0,
    currentLocationEvent: null
  },

  shop: {
    active: false,
    locationName: null,
    items: [],
    selectedShopItemId: null
  }
};

/* ---------------------------
   ALLY LOCATIONS
--------------------------- */
const allyLocations = {
  "burning": "Power Armor Soldier",
  "highway": "The Ghoul",
  "ncr": "NCR Trooper",
  "vegas": "Settler",
  "vault_33": "Lucy MacLean",
  "vault": "Vault Dweller"
};

/* ---------------------------
   SHOP DATA
--------------------------- */
const locationShops = {
  "Highway Town": [
    { id: "shop_pistol", name: "9mm Pistol", type: "weapon", damage: 7, rarity: "Uncommon", price: 25 },
    { id: "shop_stim", name: "Stimpak", type: "consumable", heal: 15, price: 15 },
    { id: "shop_scrap", name: "Scrap", type: "misc", price: 0.25 }
  ],
  "Lucy’s Crossing": [
    { id: "shop_leather", name: "Reinforced Leather Armor", type: "armor", hpBoost: 12, defense: 3, rarity: "Uncommon", price: 30 },
    { id: "shop_stim2", name: "Stimpak", type: "consumable", heal: 15, price: 15 }
  ],
  "New Vegas Strip": [
    { id: "shop_laser", name: "Laser Pistol", type: "weapon", damage: 10, rarity: "Rare", price: 40 },
    { id: "shop_stim3", name: "Stimpak", type: "consumable", heal: 15, price: 10 },
    { id: "shop_armor", name: "Combat Armor", type: "armor", hpBoost: 20, defense: 8, rarity: "Rare", price: 70 }
  ],
  "NCR Stronghold": [
    { id: "shop_rifle", name: "Service Rifle", type: "weapon", damage: 8, rarity: "Uncommon", price: 45 },
    { id: "shop_scrap2", name: "Scrap", type: "misc", price: 0.25 }
  ]
};

/* ---------------------------
   DOM REFERENCES
--------------------------- */
const tabButtons = document.querySelectorAll(".tab-button");
const tabContents = document.querySelectorAll(".tab-content");

const charNameEl = document.getElementById("char-name");
const charLevelEl = document.getElementById("char-level");
const charHpEl = document.getElementById("char-hp");
const charLocationEl = document.getElementById("char-location");
const statStrEl = document.getElementById("stat-str");
const statPerEl = document.getElementById("stat-per");
const statEndEl = document.getElementById("stat-end");
const statLckEl = document.getElementById("stat-lck");

const footerHpEl = document.getElementById("footer-hp");
const footerApEl = document.getElementById("footer-ap");
const footerCapsEl = document.getElementById("footer-caps");

const stateSelectEl = document.getElementById("state-select");
const locationListEl = document.getElementById("location-list");
const travelButton = document.getElementById("travel-button");
const mapMessageEl = document.getElementById("map-message");

const inventoryListEl = document.getElementById("inventory-list");
const useItemButton = document.getElementById("use-item-button");
const dropItemButton = document.getElementById("drop-item-button");
const inventoryMessageEl = document.getElementById("inventory-message");

const enemyNameEl = document.getElementById("enemy-name");
const enemyHpEl = document.getElementById("enemy-hp");
const attackButton = document.getElementById("attack-button");
const lootButton = document.getElementById("loot-button");
const fleeButton = document.getElementById("flee-button");
const combatMessageEl = document.getElementById("combat-message");

const recruitButton = document.getElementById("recruit-button");
const recruitMessageEl = document.getElementById("recruit-message");

const alliesListEl = document.getElementById("allies-list");
const alliesMessageEl = document.getElementById("allies-message");

const logOutputEl = document.getElementById("log-output");
const headerTimeEl = document.getElementById("header-time");

/* Optional: inventory tab element for shop/crafting UI */
const inventoryTabEl = document.getElementById("tab-inventory");

/* ---------------------------
   SHOP / CRAFTING UI ELEMENTS
--------------------------- */
let shopPanel = null;
let shopListEl = null;
let shopMessageEl = null;
let shopCloseButton = null;
let shopSellButton = null;
let craftPanel = null;
let craftScrapButton = null;
let craftDismantleButton = null;

function initShopAndCraftUI() {
  if (!inventoryTabEl) return;

  // Shop panel
  shopPanel = document.createElement("div");
  shopPanel.id = "shop-panel";
  shopPanel.style.borderTop = "1px solid #555";
  shopPanel.style.marginTop = "8px";
  shopPanel.style.paddingTop = "8px";

  const shopTitle = document.createElement("h3");
  shopTitle.textContent = "Shop";
  shopPanel.appendChild(shopTitle);

  shopListEl = document.createElement("div");
  shopListEl.id = "shop-list";
  shopPanel.appendChild(shopListEl);

  shopMessageEl = document.createElement("p");
  shopMessageEl.id = "shop-message";
  shopPanel.appendChild(shopMessageEl);

  const shopButtonsRow = document.createElement("div");
  shopButtonsRow.style.marginTop = "4px";

  shopCloseButton = document.createElement("button");
  shopCloseButton.textContent = "Close Shop";
  shopCloseButton.addEventListener("click", () => {
    gameState.shop.active = false;
    gameState.shop.items = [];
    gameState.shop.locationName = null;
    shopPanel.style.display = "none";
    shopMessageEl.textContent = "";
    saveGame();
  });
  shopButtonsRow.appendChild(shopCloseButton);

  shopSellButton = document.createElement("button");
  shopSellButton.textContent = "Sell Selected Item";
  shopSellButton.style.marginLeft = "6px";
  shopSellButton.addEventListener("click", () => {
    sellSelectedInventoryItem();
  });
  shopButtonsRow.appendChild(shopSellButton);

  shopPanel.appendChild(shopButtonsRow);

  // Crafting panel
  craftPanel = document.createElement("div");
  craftPanel.id = "craft-panel";
  craftPanel.style.borderTop = "1px solid #555";
  craftPanel.style.marginTop = "8px";
  craftPanel.style.paddingTop = "8px";

  const craftTitle = document.createElement("h3");
  craftTitle.textContent = "Crafting";
  craftPanel.appendChild(craftTitle);

  craftScrapButton = document.createElement("button");
  craftScrapButton.textContent = "Craft Stimpak (3 Scrap)";
  craftScrapButton.addEventListener("click", () => {
    craftStimpakFromScrap();
  });
  craftPanel.appendChild(craftScrapButton);

  craftDismantleButton = document.createElement("button");
  craftDismantleButton.textContent = "Scrap Selected Gear";
  craftDismantleButton.style.marginLeft = "6px";
  craftDismantleButton.addEventListener("click", () => {
    scrapSelectedGear();
  });
  craftPanel.appendChild(craftDismantleButton);

  inventoryTabEl.appendChild(shopPanel);
  inventoryTabEl.appendChild(craftPanel);

  shopPanel.style.display = "none";
}

/* ---------------------------
   TAB SWITCHING
--------------------------- */
tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    SFX.pipNav.play();

    const tab = btn.dataset.tab;
    tabButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    tabContents.forEach((content) => content.classList.add("hidden"));
    document.getElementById(`tab-${tab}`).classList.remove("hidden");

    if (tab === "allies") renderAlliesTab();
  });
});

/* ---------------------------
   RENDER FUNCTIONS
--------------------------- */
function getMaxAllies() {
  // Every level = +1 ally slot, starting at 1
  return 1 + gameState.player.level;
}

function renderStatus() {
  const p = gameState.player;
  charNameEl.textContent = p.name;
  charLevelEl.textContent = p.level;
  charHpEl.textContent = `${p.hp}/${p.maxHp}`;
  charLocationEl.textContent = `${p.location}, ${p.state}`;

  statStrEl.textContent = p.stats.str.toFixed ? p.stats.str.toFixed(2) : p.stats.str;
  statPerEl.textContent = p.stats.per;
  statEndEl.textContent = p.stats.end;
  statLckEl.textContent = p.stats.lck;

  footerHpEl.textContent = `${p.hp}/${p.maxHp}`;
  footerApEl.textContent = p.ap;
  footerCapsEl.textContent = p.caps;

  // Allies tab info
  if (alliesMessageEl) {
    alliesMessageEl.textContent = `Allies: ${gameState.player.allies.length}/${getMaxAllies()}`;
  }
}

function renderStateDropdown() {
  stateSelectEl.innerHTML = "";
  Object.keys(gameState.states).forEach((state) => {
    const opt = document.createElement("option");
    opt.value = state;
    opt.textContent = state;
    if (state === gameState.selectedState) opt.selected = true;
    stateSelectEl.appendChild(opt);
  });

  stateSelectEl.addEventListener("change", (e) => {
    SFX.click.play();
    gameState.selectedState = e.target.value;
    gameState.selectedLocationId = gameState.states[gameState.selectedState][0].id;
    renderLocations();
    updateRecruitButton();
  });
}

function renderLocations() {
  locationListEl.innerHTML = "";

  const locations = gameState.states[gameState.selectedState];

  locations.forEach((loc) => {
    const wrapper = document.createElement("label");
    wrapper.innerHTML = `
      <input type="radio" name="location" value="${loc.id}" ${
      gameState.selectedLocationId === loc.id ? "checked" : ""
    }>
      ${loc.name} [Danger: ${loc.danger}]
    `;
    wrapper.querySelector("input").addEventListener("change", (e) => {
      SFX.click.play();
      gameState.selectedLocationId = e.target.value;
      updateRecruitButton();
    });
    locationListEl.appendChild(wrapper);
  });
}

function renderInventory() {
  inventoryListEl.innerHTML = "";
  gameState.player.inventory.forEach((item) => {
    const row = document.createElement("div");
    row.classList.add("inventory-item");
    if (gameState.selectedInventoryItemId === item.id) {
      row.classList.add("selected");
    }
    row.dataset.id = item.id;

    const qtyText = item.quantity && item.quantity > 1 ? ` (x${item.quantity})` : "";
    const eqText = item.equipped ? " [EQUIPPED]" : "";

    row.innerHTML = `
      <span>${item.name}${qtyText}${eqText}</span>
      <span>${item.type.toUpperCase()}</span>
    `;
    row.addEventListener("click", () => {
      SFX.click.play();
      gameState.selectedInventoryItemId = item.id;
      renderInventory();
    });
    inventoryListEl.appendChild(row);
  });
}

function renderEnemy() {
  if (!gameState.enemy) {
    enemyNameEl.textContent = "None";
    enemyHpEl.textContent = "-";
    attackButton.disabled = true;
    lootButton.disabled = true;
    return;
  }
  enemyNameEl.textContent = gameState.enemy.name;
  enemyHpEl.textContent = `${gameState.enemy.hp}/${gameState.enemy.maxHp}`;
  attackButton.disabled = false;
  lootButton.disabled = !gameState.enemy.defeated;
}

function log(message) {
  const p = document.createElement("p");
  p.textContent = message;
  logOutputEl.appendChild(p);
  logOutputEl.scrollTop = logOutputEl.scrollHeight;
}

/* ---------------------------
   ALLIES TAB
--------------------------- */
function renderAlliesTab() {
  alliesListEl.innerHTML = "";

  if (gameState.player.allies.length === 0) {
    alliesListEl.innerHTML = "<p>No allies recruited.</p>";
    return;
  }

  gameState.player.allies.forEach((ally, index) => {
    const div = document.createElement("div");
    div.classList.add("ally-entry");

    const color = RARITY_COLORS[ally.rarity] || "#fff";

    div.innerHTML = `
      <p>
        <strong style="color:${color}">${ally.name}</strong>
        <span style="color:${color}">(${ally.rarity})</span>
      </p>
      <p>Damage: ${ally.damage} | HP: ${ally.hp}</p>
    `;

    // Sell ally button
    const sellBtn = document.createElement("button");
    sellBtn.textContent = "Dismiss/Sell Ally";
    sellBtn.addEventListener("click", () => {
      const refund = Math.floor((ally.cost || 50) * 0.5);
      gameState.player.caps += refund;
      log(`You dismissed ${ally.name} and received ${refund} caps.`);
      gameState.player.allies.splice(index, 1);
      renderAlliesTab();
      renderStatus();
      saveGame();
    });
    div.appendChild(sellBtn);

    alliesListEl.appendChild(div);
  });

  if (alliesMessageEl) {
    alliesMessageEl.textContent = `Allies: ${gameState.player.allies.length}/${getMaxAllies()}`;
  }
}

/* ---------------------------
   RANDOM ALLY AVAILABILITY
--------------------------- */
function rollAllyAvailability() {
  const locId = gameState.selectedLocationId;
  const allyName = allyLocations[locId];

  if (!allyName) {
    gameState.availableAlly = null;
    return;
  }

  if (Math.random() < 0.5) {
    gameState.availableAlly = allyName;
  } else {
    gameState.availableAlly = null;
  }
}

/* ---------------------------
   RECRUIT BUTTON
--------------------------- */
function updateRecruitButton() {
  rollAllyAvailability();

  const allyName = gameState.availableAlly;

  if (!allyName) {
    recruitButton.classList.add("hidden");
    recruitMessageEl.textContent = "No allies available here right now.";
    return;
  }

  const ally = gameState.recruitableAllies.find(a => a.name === allyName);

  recruitButton.classList.remove("hidden");
  recruitButton.textContent = `Recruit ${ally.name} — ${ally.cost} caps (${ally.rarity})`;
  recruitButton.style.color = RARITY_COLORS[ally.rarity];
}

recruitButton.addEventListener("click", () => {
  const allyName = gameState.availableAlly;
  const ally = gameState.recruitableAllies.find(a => a.name === allyName);

  if (!ally) return;

  const maxAllies = getMaxAllies();
  if (gameState.player.allies.length >= maxAllies) {
    recruitMessageEl.textContent = `You already have the maximum allies (${maxAllies}). Level up for more slots.`;
    return;
  }

  if (gameState.player.caps < ally.cost) {
    recruitMessageEl.textContent = `Not enough caps to hire ${ally.name}.`;
    return;
  }

  SFX.recruit.play();

  gameState.player.caps -= ally.cost;

  const boostedAlly = {
    ...ally,
    damage: ally.damage + ally.boost,
    hp: ally.hp + ally.boost * 2
  };

  gameState.player.allies.push(boostedAlly);

  recruitMessageEl.textContent = `${ally.name} (${ally.rarity}) has joined your party!`;
  log(`${ally.name} recruited at ${gameState.player.location}.`);

  renderStatus();
  saveGame();
});

/* ---------------------------
   TRAVEL + LOCATION EVENTS
--------------------------- */
function maybeTriggerLocationEvent(location) {
  const eventsByLocation = {
    "New Vegas Strip": ["Caps Rain", "High Roller Night", "Invaders From Beyond"],
    "Burning Springs": ["Ash Storm", "Super Mutant Raid"],
    "Vault Ruins": ["Vault Distress Signal"],
    "Highway Town": ["Caravan Ambush", "Raider Roadblock"],
    "NCR Stronghold": ["NCR Patrol"],
    "Ruins of DC": ["Brotherhood Patrol"],
    "Vault 33": ["Vault Emergency Drill"],
    "Toledo Wastes": ["Radstorm"],
    "The Pitt Outskirts": ["Slave Uprising"],
    "Lucy’s Crossing": ["Trader Caravan"]
  };

  const name = location.name;
  const pool = eventsByLocation[name] || [];

  if (pool.length === 0) {
    gameState.events.currentLocationEvent = null;
    return;
  }

  if (Math.random() < 0.70) {
    const eventName = pool[Math.floor(Math.random() * pool.length)];
    gameState.events.currentLocationEvent = eventName;
    log(`Event started: ${eventName}`);
    combatMessageEl.textContent = `Event: ${eventName}`;

    if (eventName === "Invaders From Beyond") {
      spawnAlienEncounter();
    }
  } else {
    gameState.events.currentLocationEvent = null;
  }
}

function spawnAlienEncounter() {
  gameState.enemy = {
    name: "Alien Invader",
    hp: 30,
    maxHp: 30,
    damage: 8,
    defeated: false,
    loot: [
      { id: Date.now(), name: "Alien Alloy", type: "misc", quantity: 1 },
      { id: Date.now() + 1, name: "Stimpak", type: "consumable", heal: 15, quantity: 1 }
    ]
  };
  log("Alien Invaders appear from beyond the stars!");
  combatMessageEl.textContent = "Alien Invaders appear!";
  renderEnemy();
}

/* ---------------------------
   SHOP OPENING
--------------------------- */
function maybeOpenShop(location) {
  const shopItems = locationShops[location.name];
  if (!shopItems) {
    if (shopPanel) {
      shopPanel.style.display = "none";
    }
    gameState.shop.active = false;
    gameState.shop.items = [];
    gameState.shop.locationName = null;
    return;
  }

  // 100% chance to have a shop active when you arrive
  if (Math.random() < 1.00) {
    gameState.shop.active = true;
    gameState.shop.locationName = location.name;
    // clone items so we don't mutate base data
    gameState.shop.items = shopItems.map(item => ({ ...item }));
    renderShop();
    log(`A merchant sets up shop in ${location.name}.`);
  } else {
    if (shopPanel) {
      shopPanel.style.display = "none";
    }
    gameState.shop.active = false;
    gameState.shop.items = [];
    gameState.shop.locationName = null;
  }
}

function renderShop() {
  if (!shopPanel || !shopListEl) return;

  if (!gameState.shop.active) {
    shopPanel.style.display = "none";
    return;
  }

  shopPanel.style.display = "block";
  shopListEl.innerHTML = "";

  const title = `Shop at ${gameState.shop.locationName}`;
  shopPanel.querySelector("h3").textContent = title;

  gameState.shop.items.forEach((item) => {
    const row = document.createElement("div");
    row.classList.add("shop-item");
    row.dataset.id = item.id;

    const rarityText = item.rarity ? ` (${item.rarity})` : "";
    const color = item.rarity ? (RARITY_COLORS[item.rarity] || "#fff") : "#fff";

    row.innerHTML = `
      <span style="color:${color}">${item.name}${rarityText}</span>
      <span>${item.price} caps</span>
    `;

    row.addEventListener("click", () => {
      gameState.shop.selectedShopItemId = item.id;
      renderShop();
    });

    if (gameState.shop.selectedShopItemId === item.id) {
      row.style.backgroundColor = "rgba(255,255,255,0.1)";
    }

    const buyBtn = document.createElement("button");
    buyBtn.textContent = "Buy";
    buyBtn.style.marginLeft = "6px";
    buyBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      buyShopItem(item.id);
    });
    row.appendChild(buyBtn);

    shopListEl.appendChild(row);
  });

  shopMessageEl.textContent = "Click an item to select it, then Buy or sell your own items.";
}

/* ---------------------------
   TRAVEL BUTTON
--------------------------- */
travelButton.addEventListener("click", () => {
  SFX.travel.play();

  const locations = gameState.states[gameState.selectedState];
  const loc = locations.find((l) => l.id === gameState.selectedLocationId);

  gameState.player.location = loc.name;
  gameState.player.state = gameState.selectedState;

  mapMessageEl.textContent = `You travel to ${loc.name}.`;
  log(`Traveled to ${loc.name}.`);

  maybeTriggerLocationEvent(loc);
  maybeSpawnEnemy(loc);
  maybeOpenShop(loc);
  renderStatus();
  renderEnemy();
  renderShop();
  updateRecruitButton();
  saveGame();
});

/* ---------------------------
   RANDOM ENCOUNTERS (FASTER)
--------------------------- */
setInterval(() => {
  if (Math.random() < 0.25 && !gameState.enemy) {
    const locs = gameState.states[gameState.player.state];
    const loc = locs.find((l) => l.name === gameState.player.location);
    maybeSpawnEnemy(loc);
    renderEnemy();
  }
}, 3000);

/* ---------------------------
   ENEMY SPAWNING
--------------------------- */
function maybeSpawnEnemy(location) {
  const isWestVirginia = gameState.player.state === "West Virginia";
  const isNewVegas = location.id === "vegas";

  // Deathclaw rare spawn
  if ((isWestVirginia || isNewVegas) && Math.random() < 1 / 20) {
    gameState.enemy = {
      name: "Deathclaw",
      hp: 250,
      maxHp: 250,
      damage: 18,
      defeated: false,
      loot: [
        { id: Date.now(), name: "Deathclaw Hide", type: "misc", quantity: 1 },
        { id: Date.now() + 1, name: "Caps", type: "caps", caps: 100, quantity: 1 }
      ]
    };
    combatMessageEl.textContent = "A Deathclaw emerges from the shadows!";
    log("A Deathclaw appears! Good luck... You'll need it.");
    return;
  }

  // Mothman rare spawn
  if (isWestVirginia && Math.random() < 1 / 100) {
    gameState.enemy = {
      name: "Mothman",
      hp: 250,
      maxHp: 250,
      damage: 14,
      defeated: false,
      loot: [
        { id: Date.now(), name: "Mothman Wing", type: "misc", quantity: 1 },
        { id: Date.now() + 1, name: "Caps", type: "caps", caps: 100, quantity: 1 }
      ]
    };
    combatMessageEl.textContent = "The Mothman watches you from the dark...";
    log("The Mothman has appeared!");
    return;
  }

  const roll = Math.random();
  let threshold = location.danger === "Low" ? 0.5 : location.danger === "Medium" ? 0.8 : 0.95;

  if (roll < threshold) {
    gameState.enemy = createEnemyForLocation(location);
    combatMessageEl.textContent = `A ${gameState.enemy.name} appears!`;
    log(`Encountered ${gameState.enemy.name}.`);
  } else {
    gameState.enemy = null;
    combatMessageEl.textContent = "The area is quiet. A little too quiet...";
  }
}

function createEnemyForLocation(location) {
  const enemies = {
    Low: ["Radroach", "Mole Rat"],
    Medium: ["Raider", "Wasteland Dog", "Feral Ghoul"],
    High: ["Mutant", "Deathclaw Cub", "Feral Ghoul"]
  };

  const name = enemies[location.danger][Math.floor(Math.random() * enemies[location.danger].length)];
  const hp = location.danger === "Low" ? 10 : location.danger === "Medium" ? 20 : 35;
  const dmg = location.danger === "Low" ? 3 : location.danger === "Medium" ? 6 : 10;

  // 10% chance to drop armor
  const maybeArmor = Math.random() < 0.30 ? [{
    id: Date.now() + 2,
    name: "Raider Armor",
    type: "armor",
    hpBoost: 8,
    defense: 1,
    rarity: "Uncommon",
    equipped: false,
    quantity: 1
  }] : [];

  return {
    name,
    hp,
    maxHp: hp,
    damage: dmg,
    defeated: false,
    loot: [
      { id: Date.now(), name: "Scrap", type: "misc", quantity: 1 },
      { id: Date.now() + 1, name: "Stimpak", type: "consumable", heal: 15, quantity: 1 },
      ...maybeArmor
    ]
  };
}
/* ---------------------------
   XP + LEVELING SYSTEM
--------------------------- */
function addXP(amount) {
  gameState.player.xp += amount;
  log(`Gained ${amount} XP.`);

  if (gameState.player.xp >= gameState.player.xpToNext) {
    levelUp();
  }

  saveGame();
}

function levelUp() {
  const p = gameState.player;

  p.level++;
  p.xp = 0;
  p.xpToNext = Math.floor(p.xpToNext * 1.25);

  // Strength boost: +0.3% to 0.5%
  const boostPercent = (Math.random() * 0.2 + 0.3) / 100;
  const rawBoost = p.stats.str * boostPercent;
  const finalBoost = rawBoost < 0.1 ? 0.1 : rawBoost;

  p.stats.str += finalBoost;

  log(`LEVEL UP! You reached level ${p.level}.`);
  log(`Strength increased by ${finalBoost.toFixed(2)}.`);

  renderStatus();
  saveGame();
}

/* ---------------------------
   COMBAT (WEAPON + ARMOR SYSTEM)
--------------------------- */
attackButton.addEventListener("click", () => {
  const enemy = gameState.enemy;
  if (!enemy || enemy.defeated) return;

  SFX.attack.play();

  // Equipped weapon
  const weapon = gameState.player.inventory.find(i => i.type === "weapon" && i.equipped);
  let weaponDamage = 0;

  if (weapon) {
    const mult = RARITY_WEAPON_MULTIPLIER[weapon.rarity] || 1;
    weaponDamage = Math.floor(weapon.damage * mult);
  }

  const baseDamage = 3 + gameState.player.stats.str;
  const allyDamage = gameState.player.allies.reduce((sum, a) => sum + a.damage, 0);
  const totalDamage = baseDamage + weaponDamage + allyDamage;

  // Ally name message
  let message = "";
  const names = gameState.player.allies.map(a => a.name);

  if (names.length === 0) {
    message = `You deal ${totalDamage} damage!`;
  } else if (names.length === 1) {
    message = `You and ${names[0]} deal ${totalDamage} damage!`;
  } else if (names.length === 2) {
    message = `You, ${names[0]}, and ${names[1]} deal ${totalDamage} damage!`;
  } else {
    const allButLast = names.slice(0, -1).join(", ");
    const last = names[names.length - 1];
    message = `You, ${allButLast}, and ${last} deal ${totalDamage} damage!`;
  }

  combatMessageEl.textContent = message;
  log(message);

  enemy.hp -= totalDamage;
  if (enemy.hp < 0) enemy.hp = 0;

  /* ---------------------------
     ENEMY DEFEATED — XP + CAPS + BONUS STIMPAK
  --------------------------- */
  if (enemy.hp <= 0) {
    enemy.defeated = true;

    // XP reward
    addXP(25 + Math.floor(Math.random() * 15));

    let caps = Math.floor(Math.random() * 15) + 5;
    if (gameState.events.capsFrenzyActive) caps *= 2;

    gameState.player.caps += caps;

    log(`Enemy dropped ${caps} caps.`);
    combatMessageEl.textContent = `You defeated the ${enemy.name} and gained ${caps} caps!`;

    // EXTRA 25% CHANCE FOR BONUS STIMPAK
    if (Math.random() < 0.25) {
      const stim = gameState.player.inventory.find(i => i.name === "Stimpak" && i.type === "consumable");
      if (stim) stim.quantity++;
      else {
        gameState.player.inventory.push({
          id: Date.now() + 999,
          name: "Stimpak",
          type: "consumable",
          heal: 15,
          quantity: 1
        });
      }
      log("You found an extra Stimpak on the corpse.");
    }

    lootButton.disabled = false;
    renderStatus();
    renderInventory();
    renderEnemy();
    saveGame();
    return;
  }

  /* ---------------------------
     ENEMY COUNTERATTACK
  --------------------------- */
  SFX.enemyHit.play();

  let enemyDamage = enemy.damage;

  const armor = gameState.player.inventory.find(i => i.type === "armor" && i.equipped);
  if (armor) {
    const mult = RARITY_ARMOR_MULTIPLIER[armor.rarity] || 1;
    const defense = Math.floor((armor.defense || 0) * mult);
    enemyDamage = Math.max(0, enemyDamage - defense);
  }

  gameState.player.hp -= enemyDamage;
  if (gameState.player.hp < 0) gameState.player.hp = 0;

  log(`${enemy.name} hits you for ${enemyDamage}.`);
  renderStatus();
  saveGame();

  if (gameState.player.hp <= 0) {
    combatMessageEl.textContent = "You died in the wastes...";
    attackButton.disabled = true;
    lootButton.disabled = true;
    fleeButton.disabled = true;
    log("GAME OVER.");
    return;
  }

  renderEnemy();
});

/* ---------------------------
   LOOT (with Caps Frenzy + Armor Drops)
--------------------------- */
lootButton.addEventListener("click", () => {
  const enemy = gameState.enemy;
  if (!enemy || !enemy.defeated) return;

  SFX.loot.play();

  if (!enemy.loot || enemy.loot.length === 0) {
    combatMessageEl.textContent = "Nothing to loot.";
    return;
  }

  let totalCapsGained = 0;

  enemy.loot.forEach((item) => {
    if (item.type === "caps" || item.caps) {
      let caps = item.caps || 0;
      if (gameState.events.capsFrenzyActive) caps *= 3;
      gameState.player.caps += caps;
      totalCapsGained += caps;
    } else {
      const existing = gameState.player.inventory.find(
        i => i.name === item.name && i.type === item.type
      );
      if (existing) {
        existing.quantity = (existing.quantity || 1) + (item.quantity || 1);
      } else {
        gameState.player.inventory.push({
          ...item,
          quantity: item.quantity || 1
        });
      }
      log(`Looted ${item.name}${item.quantity > 1 ? ` (x${item.quantity})` : ""}.`);
    }
  });

  if (totalCapsGained > 0) log(`Looted ${totalCapsGained} caps.`);

  enemy.loot = [];
  lootButton.disabled = true;
  combatMessageEl.textContent = "You loot the remains.";
  renderInventory();
  renderStatus();
  saveGame();
});

/* ---------------------------
   FLEE — FIXED FOR DEAD ENEMIES
--------------------------- */
fleeButton.addEventListener("click", () => {
  SFX.click.play();

  const enemy = gameState.enemy;
  if (!enemy) return;

  if (enemy.defeated) {
    combatMessageEl.textContent = "You leave the corpse behind.";
    log(`Left the remains of ${enemy.name}.`);
    gameState.enemy = null;
    renderEnemy();
    saveGame();
    return;
  }

  const success = Math.random() < 0.7;

  if (success) {
    combatMessageEl.textContent = "You escape!";
    log(`Fled from ${enemy.name}.`);
    gameState.enemy = null;
    renderEnemy();
    saveGame();
  } else {
    combatMessageEl.textContent = "Failed to escape!";
    log("Failed to flee.");
    const dmg = enemy.damage;
    gameState.player.hp -= dmg;
    if (gameState.player.hp < 0) gameState.player.hp = 0;
    log(`${enemy.name} hits you for ${dmg}.`);
    renderStatus();
    saveGame();
  }
});

/* ---------------------------
   INVENTORY USE
--------------------------- */
useItemButton.addEventListener("click", () => {
  SFX.click.play();

  const id = gameState.selectedInventoryItemId;
  if (!id) return;

  const idx = gameState.player.inventory.findIndex((i) => i.id === id);
  const item = gameState.player.inventory[idx];
  if (!item) return;

  /* ---------------------------
     WEAPON EQUIP
  --------------------------- */
  if (item.type === "weapon") {
    gameState.player.inventory.forEach(i => {
      if (i.type === "weapon") i.equipped = false;
    });

    item.equipped = true;
    inventoryMessageEl.textContent = `Equipped ${item.name}.`;
    log(`Equipped ${item.name}.`);
    renderInventory();
    saveGame();
    return;
  }

  /* ---------------------------
     ARMOR EQUIP
  --------------------------- */
  if (item.type === "armor") {
    gameState.player.inventory.forEach(i => {
      if (i.type === "armor" && i.equipped) {
        const oldMult = RARITY_ARMOR_MULTIPLIER[i.rarity] || 1;
        gameState.player.maxHp -= Math.floor(i.hpBoost * oldMult);
        i.equipped = false;
      }
    });

    item.equipped = true;

    const mult = RARITY_ARMOR_MULTIPLIER[item.rarity] || 1;
    gameState.player.maxHp += Math.floor(item.hpBoost * mult);

    inventoryMessageEl.textContent = `Equipped ${item.name}.`;
    log(`Equipped ${item.name}.`);
    renderInventory();
    renderStatus();
    saveGame();
    return;
  }

  /* ---------------------------
     CONSUMABLES
  --------------------------- */
  if (item.type === "consumable") {
    gameState.player.hp = Math.min(
      gameState.player.maxHp,
      gameState.player.hp + item.heal
    );
    item.quantity--;
    if (item.quantity <= 0) {
      gameState.player.inventory.splice(idx, 1);
    }
    inventoryMessageEl.textContent = `Used ${item.name}.`;
    log(`Used ${item.name}.`);
  }

  gameState.selectedInventoryItemId = null;
  renderInventory();
  renderStatus();
  saveGame();
});

/* ---------------------------
   DROP ITEM
--------------------------- */
dropItemButton.addEventListener("click", () => {
  SFX.click.play();

  const id = gameState.selectedInventoryItemId;
  if (!id) return;

  const idx = gameState.player.inventory.findIndex((i) => i.id === id);
  const item = gameState.player.inventory[idx];
  if (!item) return;

  if (item.equipped) {
    log(`Cannot drop equipped item: ${item.name}.`);
    inventoryMessageEl.textContent = "Unequip item before dropping.";
    return;
  }

  item.quantity--;
  if (item.quantity <= 0) {
    gameState.player.inventory.splice(idx, 1);
  }

  inventoryMessageEl.textContent = `Dropped ${item.name}.`;
  log(`Dropped ${item.name}.`);

  gameState.selectedInventoryItemId = null;
  renderInventory();
  saveGame();
});

/* ---------------------------
   SHOP BUY / SELL HELPERS
--------------------------- */
function buyShopItem(shopItemId) {
  const item = gameState.shop.items.find(i => i.id === shopItemId);
  if (!item) return;

  if (gameState.player.caps < item.price) {
    if (shopMessageEl) shopMessageEl.textContent = "Not enough caps.";
    log("Tried to buy but not enough caps.");
    return;
  }

  gameState.player.caps -= item.price;

  const newItem = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    name: item.name,
    type: item.type,
    quantity: 1
  };

  if (item.type === "weapon") {
    newItem.damage = item.damage;
    newItem.rarity = item.rarity || "Common";
    newItem.equipped = false;
  } else if (item.type === "armor") {
    newItem.hpBoost = item.hpBoost;
    newItem.defense = item.defense || 0;
    newItem.rarity = item.rarity || "Common";
    newItem.equipped = false;
  } else if (item.type === "consumable") {
    newItem.heal = item.heal || 10;
  }

  const existing = gameState.player.inventory.find(
    i => i.name === newItem.name && i.type === newItem.type
  );
  if (existing) {
    existing.quantity = (existing.quantity || 1) + 1;
  } else {
    gameState.player.inventory.push(newItem);
  }

  if (shopMessageEl) shopMessageEl.textContent = `Bought ${item.name}.`;
  log(`Bought ${item.name} for ${item.price} caps.`);

  renderStatus();
  renderInventory();
  saveGame();
}

function getItemSellValue(item) {
  let base = 5;
  if (item.type === "weapon") {
    base = (item.damage || 5) * 3;
  } else if (item.type === "armor") {
    base = ((item.hpBoost || 5) + (item.defense || 0) * 2) * 2;
  } else if (item.type === "consumable") {
    base = 10;
  } else if (item.type === "misc") {
    base = 5;
  }

  const rarityMult = {
    "Common": 1,
    "Uncommon": 1.3,
    "Rare": 1.7,
    "Legendary": 2.5
  };
  const mult = rarityMult[item.rarity] || 1;
  return Math.max(1, Math.floor(base * mult * 0.5));
}

function sellSelectedInventoryItem() {
  const id = gameState.selectedInventoryItemId;
  if (!id) {
    if (shopMessageEl) shopMessageEl.textContent = "Select an item in your inventory to sell.";
    return;
  }

  const idx = gameState.player.inventory.findIndex((i) => i.id === id);
  const item = gameState.player.inventory[idx];
  if (!item) return;

  if (item.equipped) {
    if (shopMessageEl) shopMessageEl.textContent = "Unequip item before selling.";
    return;
  }

  const value = getItemSellValue(item);
  gameState.player.caps += value;

  item.quantity--;
  if (item.quantity <= 0) {
    gameState.player.inventory.splice(idx, 1);
  }

  if (shopMessageEl) shopMessageEl.textContent = `Sold ${item.name} for ${value} caps.`;
  log(`Sold ${item.name} for ${value} caps.`);

  gameState.selectedInventoryItemId = null;
  renderInventory();
  renderStatus();
  saveGame();
}

/* ---------------------------
   CRAFTING HELPERS
--------------------------- */
function countScrap() {
  const scrap = gameState.player.inventory.find(
    i => i.name === "Scrap" && i.type === "misc"
  );
  return scrap ? (scrap.quantity || 1) : 0;
}

function removeScrap(amount) {
  const scrap = gameState.player.inventory.find(
    i => i.name === "Scrap" && i.type === "misc"
  );
  if (!scrap) return;

  scrap.quantity -= amount;
  if (scrap.quantity <= 0) {
    const idx = gameState.player.inventory.indexOf(scrap);
    if (idx >= 0) gameState.player.inventory.splice(idx, 1);
  }
}

function craftStimpakFromScrap() {
  const needed = 3;
  const have = countScrap();
  if (have < needed) {
    inventoryMessageEl.textContent = `Not enough Scrap. Need ${needed}, have ${have}.`;
    log("Crafting failed: not enough Scrap.");
    return;
  }

  removeScrap(needed);

  const existingStim = gameState.player.inventory.find(
    i => i.name === "Stimpak" && i.type === "consumable"
  );
  if (existingStim) {
    existingStim.quantity = (existingStim.quantity || 1) + 1;
  } else {
    gameState.player.inventory.push({
      id: Date.now() + 5000,
      name: "Stimpak",
      type: "consumable",
      heal: 15,
      quantity: 1
    });
  }

  inventoryMessageEl.textContent = "Crafted 1 Stimpak from Scrap.";
  log("Crafted 1 Stimpak from Scrap.");
  renderInventory();
  saveGame();
}

function scrapSelectedGear() {
  const id = gameState.selectedInventoryItemId;
  if (!id) {
    inventoryMessageEl.textContent = "Select gear to scrap.";
    return;
  }

  const idx = gameState.player.inventory.findIndex((i) => i.id === id);
  const item = gameState.player.inventory[idx];
  if (!item) return;

  if (item.type !== "weapon" && item.type !== "armor") {
    inventoryMessageEl.textContent = "Only weapons and armor can be scrapped.";
    return;
  }

  if (item.equipped) {
    inventoryMessageEl.textContent = "Unequip gear before scrapping.";
    return;
  }

  item.quantity--;
  if (item.quantity <= 0) {
    gameState.player.inventory.splice(idx, 1);
  }

  const scrap = gameState.player.inventory.find(
    i => i.name === "Scrap" && i.type === "misc"
  );
  if (scrap) {
    scrap.quantity = (scrap.quantity || 1) + 2;
  } else {
    gameState.player.inventory.push({
      id: Date.now() + 6000,
      name: "Scrap",
      type: "misc",
      quantity: 2
    });
  }

  inventoryMessageEl.textContent = `Scrapped ${item.name} into Scrap.`;
  log(`Scrapped ${item.name} into Scrap.`);
  gameState.selectedInventoryItemId = null;
  renderInventory();
  saveGame();
}
/* ---------------------------
   CAPS FRENZY GLOBAL EVENT
--------------------------- */
function tickCapsFrenzy() {
  const roll = Math.floor(Math.random() * 600) + 1;

  if (!gameState.events.capsFrenzyActive && roll === 260) {
    gameState.events.capsFrenzyActive = true;
    gameState.events.capsFrenzyTimer = 100;
    log("EVENT: Caps Frenzy has begun! Enemies drop caps and caps are doubled.");
    combatMessageEl.textContent = "EVENT: Caps Frenzy!";
  }

  if (gameState.events.capsFrenzyActive) {
    gameState.events.capsFrenzyTimer -= 1;
    if (gameState.events.capsFrenzyTimer <= 0) {
      gameState.events.capsFrenzyActive = false;
      log("EVENT: Caps Frenzy has ended.");
      combatMessageEl.textContent = "Caps Frenzy has ended.";
    }
  }
}

/* ---------------------------
   CLOCK
--------------------------- */
function updateHeaderTime() {
  const now = new Date();
  headerTimeEl.textContent = `${String(now.getHours()).padStart(
    2,
    "0"
  )}:${String(now.getMinutes()).padStart(2, "0")}`;
}
setInterval(updateHeaderTime, 1000);

/* ---------------------------
   SAVE / LOAD SYSTEM
--------------------------- */
function saveGame() {
  const snapshot = {
    player: gameState.player,
    selectedState: gameState.selectedState,
    selectedLocationId: gameState.selectedLocationId,
    events: gameState.events,
    shop: {
      active: gameState.shop.active,
      locationName: gameState.shop.locationName
    }
  };

  try {
    localStorage.setItem("wastelandSave", JSON.stringify(snapshot));
  } catch (e) {
    console.error("Failed to save game:", e);
  }
}

function loadGame() {
  const data = localStorage.getItem("wastelandSave");
  if (!data) return;

  try {
    const saved = JSON.parse(data);

    if (saved.player) Object.assign(gameState.player, saved.player);
    if (saved.selectedState) gameState.selectedState = saved.selectedState;
    if (saved.selectedLocationId) gameState.selectedLocationId = saved.selectedLocationId;
    if (saved.events) Object.assign(gameState.events, saved.events);

    if (saved.shop) {
      gameState.shop.active = saved.shop.active || false;
      gameState.shop.locationName = saved.shop.locationName || null;

      if (gameState.shop.locationName) {
        const locName = gameState.shop.locationName;
        const baseItems = locationShops[locName] || [];
        gameState.shop.items = baseItems.map(i => ({ ...i }));
      }
    }

    log("Loaded saved game.");
  } catch (e) {
    console.error("Save corrupted:", e);
  }
}

/* ---------------------------
   GLOBAL TICK
--------------------------- */
setInterval(() => {
  tickCapsFrenzy();
}, 1000);

/* ---------------------------
   INITIAL RENDER
--------------------------- */
initShopAndCraftUI();
loadGame();
renderStatus();
renderStateDropdown();
renderLocations();
renderInventory();
renderEnemy();
renderShop();
updateRecruitButton();
log("Welcome to Wasteland RPG — the wastes grow larger every day.");
