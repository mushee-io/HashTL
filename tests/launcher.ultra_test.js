const path = require('path');

module.exports = class test {
    requiresSystemContracts() { return false; }

    tests({ assert, common, cleos, keychain }) {
        return {
            'deploys HashTL': async () => {
                for (const account of ['hashedlaunch', 'hashcreator', 'receiveracct']) {
                    const publicKey = await keychain.generateAndReturnPublicKey(account);
                    assert(publicKey, `could not generate key for ${account}`);
                    await cleos(
                        `create account eosio ${account} ${publicKey} ${publicKey}`,
                        { swallow: false, fetch: false },
                    );
                }

                const buildDir = path.resolve(__dirname, '../contract/build');
                const deployed = await cleos(
                    `set contract hashedlaunch "${buildDir}" hashedlaunch.wasm hashedlaunch.abi -p hashedlaunch@active`,
                    { swallow: false, fetch: false },
                );
                assert(deployed, 'HashTL deployment failed');
            },

            'creates a native Ultra token': async () => {
                await common.pushAction(
                    'hashedlaunch',
                    'launch',
                    'hashcreator@active',
                    [
                        'hashcreator',
                        '1000000.00000000 HASH',
                        '500000.00000000 HASH',
                        'HashTL Test Token',
                        'https://example.com/hash.json',
                    ],
                );

                const stats = await common.getTable('hashedlaunch', 'HASH', 'stat');
                assert(stats.rows[0].supply === '500000.00000000 HASH', 'unexpected supply');
                assert(stats.rows[0].max_supply === '1000000.00000000 HASH', 'unexpected max supply');

                const balances = await common.getTable('hashedlaunch', 'hashcreator', 'accounts');
                assert(balances.rows[0].balance === '500000.00000000 HASH', 'issuer balance mismatch');
            },

            'transfers, mints and burns': async () => {
                await common.pushAction(
                    'hashedlaunch',
                    'transfer',
                    'hashcreator@active',
                    ['hashcreator', 'receiveracct', '25.00000000 HASH', 'test'],
                );

                await common.pushAction(
                    'hashedlaunch',
                    'issue',
                    'hashcreator@active',
                    ['hashcreator', '100.00000000 HASH', 'mint'],
                );

                await common.pushAction(
                    'hashedlaunch',
                    'retire',
                    'hashcreator@active',
                    ['50.00000000 HASH', 'burn'],
                );

                const receiver = await common.getTable('hashedlaunch', 'receiveracct', 'accounts');
                assert(receiver.rows[0].balance === '25.00000000 HASH', 'transfer failed');

                const stats = await common.getTable('hashedlaunch', 'HASH', 'stat');
                assert(stats.rows[0].supply === '500050.00000000 HASH', 'mint/burn supply mismatch');
            },

            'rejects duplicate symbols': async () => {
                await common.transactAssert(
                    [{
                        account: 'hashedlaunch',
                        name: 'launch',
                        authorization: [{ actor: 'hashcreator', permission: 'active' }],
                        data: {
                            issuer: 'hashcreator',
                            maximum_supply: '1000.00000000 HASH',
                            initial_supply: '1000.00000000 HASH',
                            token_name: 'Duplicate HASH',
                            metadata_uri: '',
                        },
                    }],
                    'token symbol already exists on this launcher',
                );
            },
        };
    }
};
