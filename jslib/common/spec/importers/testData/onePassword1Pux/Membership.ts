import { ExportData } from "jslib-common/importers/onepasswordImporters/types/onepassword1PuxImporterTypes";

export const MembershipData: ExportData = {
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
              uuid: "ofdp2szoty2ujk6yv5ebn4wjr4",
              favIndex: 1,
              createdAt: 1619467269,
              updatedAt: 1619467368,
              trashed: false,
              categoryUuid: "105",
              details: {
                loginFields: [],
                notesPlain: "My Library Card",
                sections: [
                  {
                    title: "",
                    fields: [
                      {
                        title: "group",
                        id: "org_name",
                        value: {
                          string: "National Public Library",
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
                        title: "website",
                        id: "website",
                        value: {
                          url: "https://npl.nullvalue.gov.test",
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
                        title: "telephone",
                        id: "phone",
                        value: {
                          phone: "9995555555",
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
                        title: "member name",
                        id: "member_name",
                        value: {
                          string: "George Engels",
                        },
                        indexAtSource: 3,
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
                        title: "member since",
                        id: "member_since",
                        value: {
                          monthYear: 199901,
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
                        title: "expiry date",
                        id: "expiry_date",
                        value: {
                          monthYear: 203412,
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
                        title: "member ID",
                        id: "membership_no",
                        value: {
                          string: "64783862",
                        },
                        indexAtSource: 6,
                        guarded: false,
                        multiline: false,
                        dontGenerate: false,
                        inputTraits: {
                          keyboard: "namePhonePad",
                          correction: "no",
                          capitalization: "default",
                        },
                      },
                      {
                        title: "PIN",
                        id: "pin",
                        value: {
                          concealed: "19191",
                        },
                        indexAtSource: 7,
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
                ],
                passwordHistory: [],
              },
              overview: {
                subtitle: "George Engels",
                tags: ["Education"],
                title: "Library Card",
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
