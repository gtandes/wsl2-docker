export interface Answer {
  id: string;
  sort: number;
  answer_text: string;
}

export interface Question {
  question_text: string;
  answers: Answer[];
  image_id?: string;
  is_answered?: boolean;
}

export interface QuestionItem {
  id: string;
  assignment_id: number;
  question: Question;
  question_id: string;
  question_index: number;
  category: string;
  image?: string;
}

interface DbSchema {
  storeName: string;
  keyPath: string;
  indexes?: { name: string; keyPath: string; options?: IDBIndexParameters }[];
}

interface CacheOptions {
  dbName: string;
  dbVersion: number;
  storeName: string;
  expiryTimeMs?: number;
}

interface StoredData<T> {
  data: T;
  timestamp: number;
}

const openDatabase = (
  dbName: string,
  dbVersion: number,
  schema: DbSchema
): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("IndexedDB is not available in this environment."));
      return;
    }

    const request = indexedDB.open(dbName, dbVersion);

    request.onerror = (event) => {
      reject(
        new Error(
          `IndexedDB error: ${(event.target as IDBRequest).error?.message}`
        )
      );
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBRequest).result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBRequest).result;

      if (!db.objectStoreNames.contains(schema.storeName)) {
        const objectStore = db.createObjectStore(schema.storeName, {
          keyPath: schema.keyPath,
        });

        objectStore.createIndex("id", "id", { unique: true });
        objectStore.createIndex("question_id", "question_id", {
          unique: false,
        });

        if (schema.indexes) {
          schema.indexes.forEach((index) => {
            objectStore.createIndex(index.name, index.keyPath, index.options);
          });
        }
      }
    };
  });
};

export const createQuestionItem = (
  data: Omit<QuestionItem, "question"> & {
    question: Omit<Question, "is_answered">;
  }
): QuestionItem => ({
  ...data,
  question: {
    ...data.question,
    is_answered: false,
  },
});

export const storeQuestions = async (
  questions: QuestionItem[],
  options: CacheOptions
): Promise<void> => {
  try {
    const db = await openDatabase(options.dbName, options.dbVersion, {
      storeName: options.storeName,
      keyPath: "id",
    });

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([options.storeName], "readwrite");

      transaction.oncomplete = () => {
        db.close();
        resolve();
      };

      transaction.onerror = (event) => {
        db.close();
        reject(
          new Error(
            `Transaction error: ${(event.target as IDBRequest).error?.message}`
          )
        );
      };

      const store = transaction.objectStore(options.storeName);

      questions.forEach((q) => {
        const timestamp = Date.now();

        // Ensure is_answered is set and store the object directly
        const questionItem = {
          ...q,
          question: {
            ...q.question,
            is_answered: q.question.is_answered ?? false,
          },
          timestamp: timestamp,
        };

        // Store the question item directly
        store.put(questionItem);
      });
    });
  } catch (error) {
    console.error("Error storing data in IndexedDB", error);
  }
};

export const getAllQuestions = async (
  options: CacheOptions
): Promise<QuestionItem[] | null> => {
  try {
    const db = await openDatabase(options.dbName, options.dbVersion, {
      storeName: options.storeName,
      keyPath: "id",
    });

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([options.storeName], "readonly");
      const store = transaction.objectStore(options.storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        db.close();
        const result = request.result as (QuestionItem & {
          timestamp: number;
        })[];

        if (!result || result.length === 0) {
          resolve(null);
          return;
        }

        resolve(result);
      };

      request.onerror = (event) => {
        db.close();
        reject(
          new Error(
            `Get data error: ${(event.target as IDBRequest).error?.message}`
          )
        );
      };
    });
  } catch (error) {
    console.error("Error retrieving questions from IndexedDB:", error);
    return null;
  }
};

export const getQuestionById = async (
  questionId: string,
  options: CacheOptions
): Promise<QuestionItem | null> => {
  try {
    const db = await openDatabase(options.dbName, options.dbVersion, {
      storeName: options.storeName,
      keyPath: "id",
    });

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([options.storeName], "readonly");
      const store = transaction.objectStore(options.storeName);

      const index = store.index("question_id");
      const request = index.get(questionId);

      request.onsuccess = () => {
        db.close();

        const result = request.result as
          | (QuestionItem & { timestamp: number })
          | undefined;

        if (!result) {
          resolve(null);
          return;
        }

        if (
          options.expiryTimeMs &&
          Date.now() - result.timestamp > options.expiryTimeMs
        ) {
          resolve(null);
          return;
        }

        const { timestamp, ...question } = result;
        resolve(question);
      };

      request.onerror = (event) => {
        db.close();
        reject(
          new Error(
            `Get question error: ${(event.target as IDBRequest).error?.message}`
          )
        );
      };
    });
  } catch (error) {
    console.error(`Error retrieving question:`, error);
    return null;
  }
};

export const clearQuestions = async (options: CacheOptions): Promise<void> => {
  try {
    const db = await openDatabase(options.dbName, options.dbVersion, {
      storeName: options.storeName,
      keyPath: "id",
    });

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([options.storeName], "readwrite");
      const store = transaction.objectStore(options.storeName);
      const request = store.clear();

      request.onsuccess = () => {
        db.close();
        resolve();
      };

      request.onerror = (event) => {
        db.close();
        reject(
          new Error(
            `Clear store error: ${(event.target as IDBRequest).error?.message}`
          )
        );
      };
    });
  } catch (error) {
    console.error("Error clearing questions in IndexedDB:", error);
    throw error;
  }
};

export const updateQuestionAnsweredStatus = async (
  questionId: string,
  isAnswered: boolean,
  options: CacheOptions
): Promise<QuestionItem | null> => {
  try {
    const question = await getQuestionById(questionId, options);

    if (!question) {
      console.error(`Question with ID ${questionId} not found`);
      return null;
    }

    const updateQuestion = {
      ...question,
      question: {
        ...question.question,
        is_answered: isAnswered,
      },
      timestamp: Date.now(),
    };

    const db = await openDatabase(options.dbName, options.dbVersion, {
      storeName: options.storeName,
      keyPath: "id",
    });

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([options.storeName], "readwrite");
      const store = transaction.objectStore(options.storeName);

      const request = store.put(updateQuestion);

      request.onsuccess = () => {
        const { timestamp, ...resultQuestion } = updateQuestion;
        resolve(resultQuestion);
      };

      request.onerror = (event) => {
        db.close();
        reject(new Error(`Update question error`));
      };
    });
  } catch (error) {
    console.error(`Error updating question status`);
    return null;
  }
};

export const countAnsweredQuestions = async (
  options: CacheOptions
): Promise<number> => {
  try {
    const db = await openDatabase(options.dbName, options.dbVersion, {
      storeName: options.storeName,
      keyPath: "id",
    });

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([options.storeName], "readonly");
      const store = transaction.objectStore(options.storeName);

      let count = 0;
      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest<IDBCursorWithValue | null>)
          .result;

        if (cursor) {
          const record = cursor.value;
          if (
            record &&
            record.question &&
            record.question.is_answered === true
          ) {
            count++;
          }
          cursor.continue();
        } else {
          db.close();
          resolve(count);
        }
      };

      request.onerror = (event) => {
        db.close();
        reject(
          new Error(
            `Count answered questions error: ${
              (event.target as IDBRequest).error?.message
            }`
          )
        );
      };
    });
  } catch (error) {
    console.error("Error counting answered questions in IndexedDB:", error);
    return 0;
  }
};

export const createDbConfig = (storeName: string): CacheOptions => {
  return {
    dbName: "questions-db",
    dbVersion: 1,
    storeName: storeName,
    expiryTimeMs: 3 * 60 * 60 * 1000, // 3 hours
  };
};

const indexedDb = {
  storeQuestions,
  getAllQuestions,
  getQuestionById,
  clearQuestions,
  updateQuestionAnsweredStatus,
  countAnsweredQuestions,
  createDbConfig,
};

export default indexedDb;
