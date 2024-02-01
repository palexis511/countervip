module.exports = (client, interaction) => {
    console.log(`${client.user.tag} connecter`);
    client.user.setPresence({activities: [{name:"redbot..."}], status:"dnd"});   
};