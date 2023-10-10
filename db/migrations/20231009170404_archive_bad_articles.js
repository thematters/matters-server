//  some articles isn't pointed by any draft, so we need to fix it
//  those articles are caused by a bug in the past, which is fixed now, see PR #3293
//  more context see https://matterslab.slack.com/archives/GA0R09FHN/p1696837812767929?thread_ts=1693292579.598729&cid=GA0R09FHN
//  SQL "(select id from article where state='active') EXCEPT (select article_id from draft)" returns those articles
const badArticles = [
  45468, 47385, 47622, 48779, 50171, 53478, 53668, 54229, 54638, 56482, 56597,
  58243, 61732, 63475, 63679, 64144, 65408, 65441, 65747, 66576, 69792, 69994,
  70787, 76411, 77269, 77293, 77325, 78110, 78271, 78851, 79149, 82394, 82786,
  84104, 84596, 85351, 85537, 85964, 86345, 87110, 87408, 88221, 88275, 89771,
  95111, 96084, 96923, 98411, 98567, 99530, 103667, 106191, 106488, 109125,
  111013, 111292, 112687, 115270, 115339, 119992, 120286, 120924, 121079,
  121279, 121517, 122388, 123021, 125879, 132926, 136423, 140180, 148352,
  148566, 150336, 150732, 150939, 153112, 155854, 161457, 161499, 166909,
  170919, 175951, 178791, 189149, 189379, 190287, 192247, 197467, 215150,
  222166, 227929, 234690, 240797, 244644, 245970, 247415, 248679, 252427,
  254601, 256298, 256447, 256808, 264435, 271195, 274079, 291753, 300270,
  301425, 301506, 302970, 305538, 315403, 316661, 318950, 319392, 325474,
  379639,
]

exports.up = async (knex) => {
  await knex.raw(
    /*sql*/ "UPDATE article SET state = 'archived' WHERE id = ANY(?) ;",
    [badArticles]
  )
}

exports.down = async (knex) => {
  await knex.raw(
    /*sql*/ "UPDATE article SET state = 'active' WHERE id = ANY(?) ;",
    [badArticles]
  )
}
