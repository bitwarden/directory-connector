import { ExportData } from "jslib-common/importers/onepasswordImporters/types/onepassword1PuxImporterTypes";

export const EmailFieldOnIdentityPrefilledData: ExportData = {
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
              uuid: "45mjttbbq3owgij2uis55pfrlq",
              favIndex: 0,
              createdAt: 1619465450,
              updatedAt: 1619465789,
              trashed: false,
              categoryUuid: "004",
              details: {
                loginFields: [],
                notesPlain: "",
                sections: [
                  {
                    title: "Identification",
                    name: "name",
                    fields: [],
                  },
                  {
                    title: "Address",
                    name: "address",
                    fields: [],
                  },
                  {
                    title: "Internet Details",
                    name: "internet",
                    fields: [
                      {
                        title: "email",
                        id: "email",
                        value: {
                          string: "gengels@nullvalue.test",
                        },
                        indexAtSource: 4,
                        guarded: false,
                        multiline: false,
                        dontGenerate: false,
                        inputTraits: {
                          keyboard: "emailAddress",
                          correction: "default",
                          capitalization: "default",
                        },
                      },
                      {
                        title: "2nd email",
                        id: "2nd_email",
                        value: {
                          email: {
                            email_address: "kriddler@nullvalue.test",
                            provider: "myEmailProvider",
                          },
                        },
                        indexAtSource: 1,
                        guarded: false,
                        multiline: false,
                        dontGenerate: false,
                        inputTraits: {
                          keyboard: "emailAddress",
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
                subtitle: "George Engels",
                title: "George Engels",
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
