
import http from "k6/http";
import { check, sleep } from 'k6';

export const options = {
  stages: [
    // { duration: '30s', target: 20 },
    // { duration: '1m30s', target: 10 },
    { duration: '10s', target: 0 },
  ],
};

const SERVER_ENDPOINT = `https://${__ENV.SERVER_HOSTNAME || 'server-develop.matters.news'}/graphql`;

export default function() {
  let res = http.get(http.url`${SERVER_ENDPOINT}?query={viewer{id}}`);

  check(res, {
    'status was 200': r => r.status == 200,
    // 'body was application/json': (r) => r.headers['content-type'].startsWith('application/json'),
    'body was application/json': r => !!r.json('data.viewer')
  });

  if (res.status === 200) {
    console.log((new Date).toISOString(), res.body);
    const body = JSON.parse(res.body);
  }

  sleep(0.3);

  res = http.post(SERVER_ENDPOINT, JSON.stringify({
    query: `{viewer{id}}`,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  check(res, {
    'post status was 200': r => r.status == 200,
    // 'body was application/json': (r) => r.headers['content-type'].startsWith('application/json'),
    'post res body was application/json': r => !!r.json('data.viewer')
  });

  sleep(0.3);

  res = http.post(SERVER_ENDPOINT, JSON.stringify({
    query: `# get user nfts
query UserProfilePrivate($input: UserInput!) {
  user(input:$input) {
    id userName displayName avatar
    info {
      profileCover
      description
      badges {
        type
      }
      cryptoWallet {
        id
        address
        # hasNFTs
        nfts {
          id
          name
          description
          imageUrl
          imagePreviewUrl
          # imageOriginalUrl
          contractAddress
          collectionName
          tokenMetadata
        }
      }
    }
  }
}`,
    variables: {
      input: {
	userName: "iltzvcrhvueq",
      },
    },
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  // if (res.status === 200) {
    console.log((new Date).toISOString(), JSON.stringify(res.headers), res.body);

  check(res, {
    'post status was 200': r => r.status == 200,
    // 'body was application/json': (r) => r.headers['content-type'].startsWith('application/json'),
    'post query UserProfilePrivate res body was application/json': r => !!r.json('data.user.info.cryptoWallet'),
  });

  sleep(0.3);
};
