const hashData  = {
    ['sns'] : { 
        // Name : name,
        Flags : { '@value': '0xAAAAAA00' },
        Flags : { '@value': '2' },
        // PlayerFire : playerFire,
        SuppressedFire : 'hash_71A29FA0',
        RapidFire : 'silence',
        SuppressedRapidFire : 'hash_71A29FA0',
        Report : 'hash_2033E207',
        Unk05 : { '@value': '-2' },
        Unk06 : { '@value': '50' },
        Unk07 : { '@value': '0.2' },
        Echo : 'hash_04F0F7BC',
        Unk09 : 'hash_F80C7190',
        Unk10 : 'null_sound',
        Unk11 : 'null_sound',
        Unk12 : 'hash_C95EEE7D',
        Unk13 : 'hash_BB0A8AE1',
        Unk14 : 'null_sound',
        Unk15 : 'null_sound',
        Unk16 : 'hash_A686869A',
        Unk17 : 'hash_41D1CA5F',
        PickUpWeapon : 'hash_8ACDC8A9',
        Unk19 : { '@value': '0' },
        Unk20 : 'null_sound',
        Unk21 : 'null_sound',
        Unk22 : null,
        // Unk23 : u23,
        InteriorFire : 'hash_D4D27BB8',
        Reload : 'hash_A2BE26FB',
        Unk26 : 'hash_41D1CA5F',
        Unk27 : 'hash_41D1CA5F',
        Unk28 : { '@value': '0' },
        Unk29 : { '@value': '0' },
        Aim : 'hash_E35374CE',
        Unk31 : 'null_sound',
        Unk32 : 'null_sound',
        SlowMotionFire : 'ptl_sns_player_slow_mo',
        Unk34 : 'null_sound',
        Unk35 : 'null_sound',
        Unk36 : 'null_sound',
        Unk37 : 'null_sound',
        SlowMotionReport : 'hash_B9D09508',
        Unk39 : 'null_sound',
        Unk40 : 'null_sound',
        Unk41 : 'null_sound',
        Unk42 : 'null_sound',
        Unk43 : 'null_sound',
        Unk44 : 'null_sound',
        Unk45 : 'null_sound',
        Unk46 : null,
        Unk47 : null,
        Unk48 : { '@value': '0' },
        Unk49 : { '@value': '0' },
        Unk50 : { '@value': '0' },
    }
}

const generate54Data  = {
    ['sns'] : ['ptl_sns_player_mech_env', 'ptl_sns_player_sub']
}

async function buildWeapons151(type, name, playerFire, u23) {
    const weaponData = { 
        ...hashData[type], 
        Name : name,
        PlayerFire : playerFire,
        Unk23 : u23,
    }
    return weaponData
}

async function weapon54Data(type, playerStereo) {
    let generatedData = []
    const weapData = generate54Data[type]
    generatedData.push(...weapData, playerStereo)
    return generatedData
}

module.exports = { 
    buildWeapons151, 
    weapon54Data
};