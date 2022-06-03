# secondweek

api 설계

|내용|Method|api|request|response|
|---|---|---|---|---|
|회원가입|POST|/register|id, pw, pwcheck|HttpStatus 및 메시지|
|로그인|POST|/login|id, pw|HttpStatus 및 메시지|
|게시글조회|GET|/list| | { _id, title, author, content, date, authorId } |
|게시글작성|POST|/add|{title, author, content}|{_id, title, author, content, date, authorId}, {$inc: {totalPost: 1}}|
|게시글상세조회, 댓글조회|GET|/content/:id||{_id, title, author, content, date, authorId}, {_id, comment, author, date, authorId, parentId}|
|게시글삭제|DELETE|/delete|{_id,user._id}|deleted|
|게시글수정|PUT|/edit|{title, author, content}|edited|
|댓글 작성|POST|/addcomment|{comment, author, id}, {$inc: {totalComment: 1}}|commentsaved|
|댓글 수정|PUT|/editcomment|{id,author,comment}|edited|
|댓글 삭제|DELETE|/deletecomment|{id}|deleted|
