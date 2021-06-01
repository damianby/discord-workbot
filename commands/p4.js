




























exports.module = {
                name: "p4",
                func: dispatchP4Message,
                desc: "Perforce control",
                params: [{name: "command", required: true}],
                privileges: [GROUP.ADMIN]
            }

async function dispatchP4Message(parsed, message) {

}