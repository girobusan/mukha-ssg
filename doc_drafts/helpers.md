# Inserts

```
<!--@name-->

Any markdown to represent content in regular md viewer
```

yaml: "formatted params"

```
<!--//-->
```

or

```
<!--@name-->

Any markdown to represent content in regular md viewer


<!--
yaml: "formatted params"
-->

<!--//-->
```

shorten form:

```
```@name
parameters?
```

```
<!--test comments-->

## Latid blocks to Latid2 helpers:

### Converts to regular md

- Paragraph
- Heading
- List
- Code block
- Markdown block

### Require new helper

1. Blockquote _with footer_
2. Image _with custom class and caption_
3. Video
4. Audio
5. Raw HTML code — ?
6. Attachment

#### Params in Latid (block.data)

| name              | plain md | params in latid                                                                                         |
| ----------------- | -------- | ------------------------------------------------------------------------------------------------------- |
| markdown          | yes      | markdown                                                                                                |
| paragraph         | yes      | text                                                                                                    |
| raw               | ?        | html                                                                                                    |
| list              | yes      | items ([string]) , style ("ordered" or not)                                                             |
| code              | yes      | code                                                                                                    |
| header            | yes      | level, text                                                                                             |
| script (not used) | yes      | id , url                                                                                                |
| quote             |          | text, caption                                                                                           |
| audio             |          | file.url , autoplay , loop, controls, preload                                                           |
| video             |          | file.url , autoplay , loop, controls, preload                                                           |
| badge             |          | class, text                                                                                             |
| attachment        |          | hidden, title , filename , class , extension , href                                                     |
| image             |          | caption, file.url, data.link (if image linked), withBackground , stretched, left, right, noresize, href |

<script src="../view.js"></script>
```
