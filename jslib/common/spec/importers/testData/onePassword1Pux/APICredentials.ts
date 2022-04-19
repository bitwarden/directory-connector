import { ExportData } from "jslib-common/importers/onepasswordImporters/types/onepassword1PuxImporterTypes";

export const APICredentialsData: ExportData = {
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
              uuid: "6nqnjdqyk5mwvqbdgbdr47oabe",
              favIndex: 0,
              createdAt: 1619465969,
              updatedAt: 1619466052,
              trashed: false,
              categoryUuid: "112",
              details: {
                loginFields: [],
                notesPlain: "My API Credential",
                sections: [
                  {
                    title: "",
                    fields: [
                      {
                        title: "username",
                        id: "username",
                        value: {
                          string: "apiuser@nullvalue.test",
                        },
                        indexAtSource: 0,
                        guarded: true,
                        multiline: false,
                        dontGenerate: false,
                        inputTraits: {
                          keyboard: "default",
                          correction: "no",
                          capitalization: "none",
                        },
                      },
                      {
                        title: "credential",
                        id: "credential",
                        value: {
                          concealed: "apiapiapiapiapiapiappy",
                        },
                        indexAtSource: 1,
                        guarded: true,
                        multiline: false,
                        dontGenerate: true,
                        inputTraits: {
                          keyboard: "default",
                          correction: "no",
                          capitalization: "default",
                        },
                      },
                      {
                        title: "type",
                        id: "type",
                        value: {
                          menu: "jwt",
                        },
                        indexAtSource: 2,
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
                        title: "filename",
                        id: "filename",
                        value: {
                          string: "filename.jwt",
                        },
                        indexAtSource: 3,
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
                        title: "valid from",
                        id: "validFrom",
                        value: {
                          date: 1301918460,
                        },
                        indexAtSource: 4,
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
                        title: "expires",
                        id: "expires",
                        value: {
                          date: 1932811260,
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
                        title: "hostname",
                        id: "hostname",
                        value: {
                          string: "not.your.everyday.hostname",
                        },
                        indexAtSource: 6,
                        guarded: false,
                        multiline: false,
                        dontGenerate: false,
                        inputTraits: {
                          keyboard: "uRL",
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
                subtitle: "",
                title: "API Credential",
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
