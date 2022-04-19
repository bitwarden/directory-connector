import { ExportData } from "jslib-common/importers/onepasswordImporters/types/onepassword1PuxImporterTypes";

export const SoftwareLicenseData: ExportData = {
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
              uuid: "47hvppiuwbanbza7bq6jpdjfxu",
              favIndex: 1,
              createdAt: 1619467985,
              updatedAt: 1619468230,
              trashed: false,
              categoryUuid: "100",
              details: {
                loginFields: [],
                notesPlain: "My Software License",
                sections: [
                  {
                    title: "",
                    fields: [
                      {
                        title: "version",
                        id: "product_version",
                        value: {
                          string: "5.10.1000",
                        },
                        indexAtSource: 0,
                        guarded: false,
                        multiline: false,
                        dontGenerate: false,
                        inputTraits: {
                          keyboard: "numbersAndPunctuation",
                          correction: "default",
                          capitalization: "default",
                        },
                      },
                      {
                        title: "license key",
                        id: "reg_code",
                        value: {
                          string: "265453-13457355-847327",
                        },
                        indexAtSource: 1,
                        guarded: true,
                        multiline: true,
                        dontGenerate: false,
                        inputTraits: {
                          keyboard: "default",
                          correction: "default",
                          capitalization: "default",
                        },
                      },
                    ],
                  },
                  {
                    title: "Customer",
                    name: "customer",
                    fields: [
                      {
                        title: "licensed to",
                        id: "reg_name",
                        value: {
                          string: "Kay Riddler",
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
                        title: "registered email",
                        id: "reg_email",
                        value: {
                          email: {
                            email_address: "kriddler@nullvalue.test",
                            provider: null,
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
                      {
                        title: "company",
                        id: "company",
                        value: {
                          string: "Riddles and Jigsaw Puzzles GmbH",
                        },
                        indexAtSource: 2,
                        guarded: false,
                        multiline: false,
                        dontGenerate: false,
                        inputTraits: {
                          keyboard: "default",
                          correction: "default",
                          capitalization: "words",
                        },
                      },
                    ],
                  },
                  {
                    title: "Publisher",
                    name: "publisher",
                    fields: [
                      {
                        title: "download page",
                        id: "download_link",
                        value: {
                          url: "https://limuxcompany.nullvalue.test/5.10.1000/isos",
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
                        title: "publisher",
                        id: "publisher_name",
                        value: {
                          string: "Limux Software and Hardware",
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
                        title: "website",
                        id: "publisher_website",
                        value: {
                          url: "https://limuxcompany.nullvalue.test/",
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
                        title: "retail price",
                        id: "retail_price",
                        value: {
                          string: "$999",
                        },
                        indexAtSource: 3,
                        guarded: false,
                        multiline: false,
                        dontGenerate: false,
                        inputTraits: {
                          keyboard: "numbersAndPunctuation",
                          correction: "default",
                          capitalization: "default",
                        },
                      },
                      {
                        title: "support email",
                        id: "support_email",
                        value: {
                          email: {
                            email_address: "support@nullvalue.test",
                            provider: null,
                          },
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
                  {
                    title: "Order",
                    name: "order",
                    fields: [
                      {
                        title: "purchase date",
                        id: "order_date",
                        value: {
                          date: 1617278460,
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
                        title: "order number",
                        id: "order_number",
                        value: {
                          string: "594839",
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
                        title: "order total",
                        id: "order_total",
                        value: {
                          string: "$1086.59",
                        },
                        indexAtSource: 2,
                        guarded: false,
                        multiline: false,
                        dontGenerate: false,
                        inputTraits: {
                          keyboard: "numbersAndPunctuation",
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
                subtitle: "5.10.1000",
                title: "Limux Product Key",
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
