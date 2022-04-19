import { ExportData } from "jslib-common/importers/onepasswordImporters/types/onepassword1PuxImporterTypes";

export const RewardsProgramData: ExportData = {
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
              uuid: "3bmrdcml3tngvsr6zdlvd2xo4i",
              favIndex: 0,
              createdAt: 1619467659,
              updatedAt: 1619467765,
              trashed: false,
              categoryUuid: "107",
              details: {
                loginFields: [],
                notesPlain: "My Reward Card",
                sections: [
                  {
                    title: "",
                    fields: [
                      {
                        title: "company name",
                        id: "company_name",
                        value: {
                          string: "Super Cool Store Co.",
                        },
                        indexAtSource: 0,
                        guarded: false,
                        multiline: false,
                        dontGenerate: false,
                        inputTraits: {
                          keyboard: "default",
                          correction: "default",
                          capitalization: "words",
                        },
                      },
                      {
                        title: "member name",
                        id: "member_name",
                        value: {
                          string: "Chef Coldroom",
                        },
                        indexAtSource: 1,
                        guarded: false,
                        multiline: false,
                        dontGenerate: false,
                        inputTraits: {
                          keyboard: "default",
                          correction: "default",
                          capitalization: "words",
                        },
                      },
                      {
                        title: "member ID",
                        id: "membership_no",
                        value: {
                          string: "member-29813569",
                        },
                        indexAtSource: 2,
                        guarded: false,
                        clipboardFilter:
                          "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
                        multiline: false,
                        dontGenerate: false,
                        inputTraits: {
                          keyboard: "default",
                          correction: "no",
                          capitalization: "none",
                        },
                      },
                      {
                        title: "PIN",
                        id: "pin",
                        value: {
                          concealed: "99913",
                        },
                        indexAtSource: 3,
                        guarded: false,
                        multiline: false,
                        dontGenerate: false,
                        inputTraits: {
                          keyboard: "numberPad",
                          correction: "default",
                          capitalization: "default",
                        },
                      },
                    ],
                  },
                  {
                    title: "More Information",
                    name: "extra",
                    fields: [
                      {
                        title: "member ID (additional)",
                        id: "additional_no",
                        value: {
                          string: "additional member id",
                        },
                        indexAtSource: 0,
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
                        title: "member since",
                        id: "member_since",
                        value: {
                          monthYear: 202101,
                        },
                        indexAtSource: 1,
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
                        title: "customer service phone",
                        id: "customer_service_phone",
                        value: {
                          phone: "123456",
                        },
                        indexAtSource: 2,
                        guarded: false,
                        multiline: false,
                        dontGenerate: false,
                        inputTraits: {
                          keyboard: "namePhonePad",
                          correction: "default",
                          capitalization: "default",
                        },
                      },
                      {
                        title: "phone for reservations",
                        id: "reservations_phone",
                        value: {
                          phone: "123456",
                        },
                        indexAtSource: 3,
                        guarded: false,
                        multiline: false,
                        dontGenerate: false,
                        inputTraits: {
                          keyboard: "namePhonePad",
                          correction: "default",
                          capitalization: "default",
                        },
                      },
                      {
                        title: "website",
                        id: "website",
                        value: {
                          url: "supercoolstore.com",
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
                    ],
                  },
                ],
                passwordHistory: [],
              },
              overview: {
                subtitle: "Super Cool Store Co.",
                title: "Retail Reward Thing",
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
