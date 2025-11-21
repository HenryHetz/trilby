const STORAGE_KEY = 'EmoChatUserData';
const STORAGE_VERSION = 1;

export const EmoStorage = {
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return this.defaultData();
      const data = JSON.parse(raw);

      // если версия устарела — сбросить
      if (data.version !== STORAGE_VERSION) return this.defaultData();
      return data;
    } catch (e) {
      console.warn('[EmoStorage] load error', e);
      return this.defaultData();
    }
  },

  save(data) {
    try {
      data.version = STORAGE_VERSION;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('[EmoStorage] save error', e);
    }
  },

  defaultData() {
    return {
      version: STORAGE_VERSION,
      favourites: [],       // ["🤣 🤡 LOL", "💀 F*CK"]
      lastCategory: 'POSITIVE',
      updatedAt: Date.now()
    };
  },

  addFavourite(sequence) {
    const data = this.load();
    if (!data.favourites.includes(sequence)) {
      data.favourites.unshift(sequence);
      if (data.favourites.length > 10) data.favourites.pop();
      data.updatedAt = Date.now();
      this.save(data);
    }
  }
};

// Использование внутри ЭмоЧата
// при инициализации
this.userData = EmoStorage.load();

// при отправке эмоций
const combo = this.sentence.join(' ');
EmoStorage.addFavourite(combo);

// при старте можно подгрузить избранные цепочки
this.favourites = this.userData.favourites;
