import { ExportData } from "jslib-common/importers/onepasswordImporters/types/onepassword1PuxImporterTypes";

export const DatabaseData: ExportData = {
  accounts: [
    {
      attrs: {
        accountName: "1Password Customer",
        name: "1Password Customer",
        avatar: "",
        email: "username123123123@gmail.com",
        uuid: "TRIZ3XV4JJFRXJ3BARILLTUA6E",
        domain: "https://my.1password.com/",
      },
      vaults: [
        {
          attrs: {
            uuid: "pqcgbqjxr4tng2hsqt5ffrgwju",
            desc: "Just test entries",
            avatar: "ke7i5rxnjrh3tj6uesstcosspu.png",
            name: "T's Test Vault",
            type: "U",
          },
          items: [
            {
              uuid: "ospvepl3ex2y6hjwwqwyvtf2sy",
              favIndex: 0,
              createdAt: 1619466193,
              updatedAt: 1619466276,
              trashed: false,
              categoryUuid: "102",
              details: {
                loginFields: [],
                notesPlain: "My Database",
                sections: [
                  {
                    title: "",
                    fields: [
                      {
                        title: "type",
                        id: "database_type",
                        value: {
                          menu: "postgresql",
                        },
                        indexAtSource: 0,
                        guarded: false,
                        multiline: false,
                        dontGenerate: false,
                        inputTraits: {
                          keyboard: "default",
                          correction: "default",
                          capitalization: "default",
                        },
                      },
                      {
                        title: "server",
                        id: "hostname",
                        value: {
                          string: "my.secret.db.server",
                        },
                        indexAtSource: 1,
                        guarded: false,
                        multiline: false,
                        dontGenerate: false,
                        inputTraits: {
                          keyboard: "uRL",
                          correction: "default",
                          capitalization: "default",
                        },
                      },
                      {
                        title: "port",
                        id: "port",
                        value: {
                          string: "1337",
                        },
                        indexAtSource: 2,
                        guarded: false,
                        multiline: false,
                        dontGenerate: false,
                        inputTraits: {
                          keyboard: "numberPad",
                          correction: "default",
                          capitalization: "default",
                        },
                      },
                      {
                        title: "database",
                        id: "database",
                        value: {
                          string: "user_database",
                        },
                        indexAtSource: 3,
                        guarded: false,
                        multiline: false,
                        dontGenerate: false,
                        inputTraits: {
                          keyboard: "default",
                          correction: "no",
                          capitalization: "none",
                        },
                      },
                      {
                        title: "username",
                        id: "username",
                        value: {
                          string: "cooldbuser",
                        },
                        indexAtSource: 4,
                        guarded: false,
                        multiline: false,
                        dontGenerate: false,
                        inputTraits: {
                          keyboard: "default",
                          correction: "no",
                          capitalization: "none",
                        },
                      },
                      {
                        title: "password",
                        id: "password",
                        value: {
                          concealed: "^+kTjhLaN7wVPAhGU)*J",
                        },
                        indexAtSource: 5,
                        guarded: false,
                        multiline: false,
                        dontGenerate: false,
                        inputTraits: {
                          keyboard: "default",
                          correction: "default",
                          capitalization: "default",
                        },
                      },
                      {
                        title: "SID",
                        id: "sid",
                        value: {
                          string: "ASDIUFU-283234",
                        },
                        indexAtSource: 6,
                        guarded: false,
                        multiline: false,
                        dontGenerate: false,
                        inputTraits: {
                          keyboard: "default",
                          correction: "default",
                          capitalization: "default",
                        },
                      },
                      {
                        title: "alias",
                        id: "alias",
                        value: {
                          string: "cdbu",
                        },
                        indexAtSource: 7,
                        guarded: false,
                        multiline: false,
                        dontGenerate: false,
                        inputTraits: {
                          keyboard: "default",
                          correction: "default",
                          capitalization: "default",
                        },
                      },
                      {
                        title: "connection options",
                        id: "options",
                        value: {
                          string: "ssh",
                        },
                        indexAtSource: 8,
                        guarded: false,
                        multiline: false,
                        dontGenerate: false,
                        inputTraits: {
                          keyboard: "default",
                          correction: "default",
                          capitalization: "default",
                        },
                      },
                    ],
                  },
                ],
                passwordHistory: [],
              },
              overview: {
                subtitle: "my.secret.db.server",
                title: "Database",
                url: "",
                ps: 0,
                pbe: 0.0,
                pgrng: false,
              },
            },
          ],
        },
      ],
    },
  ],
};
