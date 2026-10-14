# Grouping resolution

> PR62 baseline snapshot. Current RAR/ZIP readiness: [RAR publication summary](rar-publication-summary.md), [QA](rar-qa-summary.md), and src/data/drawing-library/rar-reanalysis.json.

元42候補を保持して再判定。31 SINGLE_PACKAGE、6 SAME_MODEL_DOWNLOAD_SET、5 REVIEW_REQUIREDです。同一modelの資料は1recordへまとめ、異なるpackageを別downloadとして保持します。設計やversionの同一性を断定しません。分割RARは1logical recordのpart別downloadで、未検証の結合や展開を行いません。nested archiveは外側containerを保持し、深さ0で判定します。

| Record                               | Decision                | Sources |
| ------------------------------------ | ----------------------- | ------- |
| drawing-boeing-airliner-unidentified | SINGLE_PACKAGE          | 1       |
| drawing-breeze2005-unidentified      | SINGLE_PACKAGE          | 1       |
| drawing-c-17                         | SINGLE_PACKAGE          | 1       |
| drawing-cessna-unidentified          | SINGLE_PACKAGE          | 1       |
| drawing-cessna182                    | SINGLE_PACKAGE          | 1       |
| drawing-color330-unidentified        | SINGLE_PACKAGE          | 1       |
| drawing-draken                       | SINGLE_PACKAGE          | 1       |
| drawing-f-14                         | SAME_MODEL_DOWNLOAD_SET | 20      |
| drawing-f-15                         | SINGLE_PACKAGE          | 1       |
| drawing-f-18                         | SINGLE_PACKAGE          | 1       |
| drawing-f-22                         | SAME_MODEL_DOWNLOAD_SET | 4       |
| drawing-f117                         | SINGLE_PACKAGE          | 1       |
| drawing-f16                          | SINGLE_PACKAGE          | 1       |
| drawing-f4d                          | SINGLE_PACKAGE          | 1       |
| drawing-f4u                          | REVIEW_REQUIRED         | 1       |
| drawing-floatplane-unidentified      | SINGLE_PACKAGE          | 1       |
| drawing-fuel-cad-unidentified        | REVIEW_REQUIRED         | 1       |
| drawing-j-20                         | SAME_MODEL_DOWNLOAD_SET | 2       |
| drawing-j10                          | SAME_MODEL_DOWNLOAD_SET | 2       |
| drawing-jas-39                       | SINGLE_PACKAGE          | 1       |
| drawing-jet-engine-manual            | REVIEW_REQUIRED         | 2       |
| drawing-kj66-engine                  | REVIEW_REQUIRED         | 3       |
| drawing-laser200                     | SINGLE_PACKAGE          | 1       |
| drawing-light-aircraft-no1           | SINGLE_PACKAGE          | 1       |
| drawing-light-helicopter             | SINGLE_PACKAGE          | 1       |
| drawing-microjet-engine              | REVIEW_REQUIRED         | 1       |
| drawing-mig-29                       | SAME_MODEL_DOWNLOAD_SET | 2       |
| drawing-mig21                        | SINGLE_PACKAGE          | 1       |
| drawing-mig25                        | SINGLE_PACKAGE          | 1       |
| drawing-mirage2000                   | SINGLE_PACKAGE          | 1       |
| drawing-model-beginner-materials     | SINGLE_PACKAGE          | 1       |
| drawing-p51                          | SINGLE_PACKAGE          | 1       |
| drawing-paper-aircraft               | SINGLE_PACKAGE          | 1       |
| drawing-piper-j3-cub                 | SINGLE_PACKAGE          | 1       |
| drawing-pitts-park-flyer             | SINGLE_PACKAGE          | 1       |
| drawing-printed-plans-unidentified   | SINGLE_PACKAGE          | 1       |
| drawing-pulse-engine-manual          | SINGLE_PACKAGE          | 1       |
| drawing-rotorcraft-unidentified      | SINGLE_PACKAGE          | 1       |
| drawing-sr71                         | SINGLE_PACKAGE          | 1       |
| drawing-su-27                        | SAME_MODEL_DOWNLOAD_SET | 2       |
| drawing-su-47                        | SINGLE_PACKAGE          | 1       |
| drawing-su37                         | SINGLE_PACKAGE          | 1       |

43 records = 42 model/package groups + existing FIGHTER。Phase1の33 proposalsを履歴として変更せず、未取り込みだった10 groupsをoverlayで補います。5件は内容再構成を伴うため確認待ちです。
