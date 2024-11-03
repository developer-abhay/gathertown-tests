const  axios = require("axios");

const BACKEND_URL = 'http://localhost:3000/api/v1'
const WS_URL = 'ws://localhost:8080'


// Signup User
const registerUser = async(username,password,type) =>{
    const response =  await axios.post(`${BACKEND_URL}/signup` , {
        username,
        password,
        type
      })
    return {status:response.status,data : response.data}
}
// SignIn User
const loginUser = async(username,password,type) =>{
    const response =  await axios.post(`${BACKEND_URL}/signin` , {
        username,
        password,
      })
      return {status:response.status,data : response.data}
}

// Tests for Auth Page (signup and Signin)
describe('Auth Page',()=>{ 
    test('User is able to signup only once',async()=>{
        const username = 'abhay' + Date.now();
        const password = '12345' + Date.now();
        
        const {status:s1,data:d1} = await registerUser(username,password,'admin')
       
        expect(s1).toBe(200)
        expect(d1.userId).toBeDefined()
    
        // 'User is not able to signup with same username'
        const {status:s2,data:d2} = await registerUser(username,password,'user')

        expect(s2).toBe(409)
        expect(d2.error).toBe('User with this username already exists.')
    })

    test('User is not able to signup if invalid inputs',async()=>{
        const username = 'abhay' + Date.now();
        const password = '12345' + Date.now();

        const {status : s1} = await registerUser(username,password,'')
        expect(s1).toBe(400)
        const {status : s2} = await registerUser(username,'','user')
        expect(s2).toBe(400)
        const {status : s3} = await registerUser('',password,'user')
        expect(s3).toBe(400)
    })
    
    test('User is able to signin successfully with correct credentials',async()=>{
        const username = 'abhay' + Date.now();
        const password = '12345' + Date.now();
        
        await registerUser(username,password,'admin')
       
        const {status,data} = await loginUser(username,password)

        expect(status).toBe(200)
        expect(data.token).toBeDefined()
    })
     
    test('User is not able to signin with wrong credentials',async()=>{
        const username = 'abhay' + Date.now();
        const password = '12345' + Date.now();
        
        await registerUser(username,password,'admin')
       
        const {status,data} = await loginUser(username,'123456789')

        expect(status).toBe(401)
        expect(data.error).toBe('Wrong Credentials');
    
    })
    
    test('User cannot signin before signup',async()=>{
        const username = 'abhay' + Date.now();
        const password = '12345' + Date.now();

        const {status,data} = await loginUser(username,password)
        expect(status).toBe(404)
        expect(data.error).toBe('User with this username does not exists.');
    })
})

// Tests for User information page
describe('USer information page', async ()=>{
    let token;
    let avatarId;
    let userId

    beforeAll(async ()=>{
        const username = 'abhay' + Date.now();
        const password = '12345' + Date.now();
        
        const {data:d1}  = await registerUser(username,password,'admin')
        userId = d1.userId
        
        const {data:d2} = await login(username,password)
        token = d2.token

        const response = await axios.post(`${BACKEND_URL}/admin/avatar`,{
            "imageUrl": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQm3RFDZM21teuCMFYx_AROjt-AzUwDBROFww&s",
            "name": "Timmy"
        },
        {
            headers:{
                "authorization": `Bearer ${token}`
            }
        })
        avatarId = response.data.avatarId;
    })

    // User update avatar endpoint
    test('User is able to update avatar', async ()=>{
        const respone = await axios.post(`${BACKEND_URL}/user/metadata`,{
            avatarId
        },
        {
            headers:{
                "authorization": `Bearer ${token}`
            }
        })
        
        expect(respone.status).toBe(200)
    })
    
    test('User is not able to update avatar if unauthorized', async ()=>{
        const response = await axios.post(`${BACKEND_URL}/user/metadata`,{
            avatarId,
        })
        
        expect(response.status).toBe(401)
    })
    
    test('User is not able to update avatar if avatar does not exits', async ()=>{
        const response = await axios.post(`${BACKEND_URL}/user/metadata`,{
            avatarId:''
        },
        {
            headers:{
                authorization: `Bearer ${token}`
            }
        })
        
        expect(response.status).toBe(400)
    })
    
    // Get all avatars
    test('Retrieve all avatars', async ()=>{
        const response = await axios.get(`${BACKEND_URL}/avatars`)
        
        expect(response.status).toBe(200)
        expect(response.data.avatars.length).not.toBe(0)
        expect(response.data.avatars[0].id).toBe(avatarId)
    })

    // Get avatars by user ID
    test('Get avatar of users by ID', async ()=>{
        const response = await axios.get(`${BACKEND_URL}/user/metadata/bulk?ids=[${userId}]`)
        
        expect(response.status).toBe(200)
        expect(response.data.avatars[0].userId).toBe(userId)
    })

    test('Get empty array if usersID doesnot exist', async ()=>{
        const response = await axios.get(`${BACKEND_URL}/user/metadata/bulk?ids=[xyz123]`)
        
        expect(response.status).toBe(404)
        expect(response.data.error).toBe('User does not exist')
    })
})

// Tests for space dashboard
describe('Space Dashboard',()=>{
    let adminToken;
    let userToken;
    let mapId;

    beforeAll(async ()=>{
        //Create a admin
        const adminName = 'abhay' + Date.now();
        const adminPassword = '12345' + Date.now();
        
        await registerUser(adminName,adminPassword,'admin')
        
        const {data} = await login(adminName,adminPassword)
        adminToken = data.token
        
        //Create a map
        const response = await axios.post(`${BACKEND_URL}/admin/map`,{
            "thumbnail": "https://thumbnail.com/a.png",
            "dimensions": "100x200",
            "name": "100 person interview room",
            "defaultElements": [],
        },
        {
            headers:{
                "authorization": `Bearer ${adminToken}`
            }
        })
        mapId = response.data.id;
        
        //Create a user
        const username = 'abhay' + Date.now();
        const password = '12345' + Date.now();

        await registerUser(username,password,'user')
        
        const {data:d2} = await login(username,password)
        userToken = d2.token
    })

    //Create space
    test('User is able to create a space',async ()=>{
        const response = await axios.post(`${BACKEND_URL}/space`,{
            "name": "Test",
            "dimensions": "100x200",
            mapId,
        },
        {
            headers:{
                authorization: `Bearer ${userToken}`
            }
        })

        expect(response.status).toBe(200)
        expect(response.data.spaceId).toBeDefined()
    })

    test('User is able to create a space without mapId',async ()=>{
        const response = await axios.post(`${BACKEND_URL}/space`,{
            "name": "Test",
            "dimensions": "100x200",
        },
        {
            headers:{
                authorization: `Bearer ${userToken}`
            }
        })

        expect(response.status).toBe(200)
        expect(response.data.spaceId).toBeDefined()
    })

    test('User is unable to create a space without dimensions',async ()=>{
        const response = await axios.post(`${BACKEND_URL}/space`,{
            "name": "Test",
            mapId,
        },
        {
            headers:{
                authorization: `Bearer ${userToken}`
            }
        })

        expect(response.status).toBe(400)
    })

    test('User is unable to create a space if unauthorized',async ()=>{
        const response = await axios.post(`${BACKEND_URL}/space`,{
            "name": "Test",
            "dimensions": "100x200",
            mapId
        })
        expect(response.status).toBe(401)
    })

    // Delete space
    test('User is able to delete a space',async ()=>{
        const response = await axios.post(`${BACKEND_URL}/space`,{
            "name": "Test",
            "dimensions": "100x200",
            mapId,
        },
        {
            headers:{
                authorization: `Bearer ${userToken}`
            }
        })
        const spaceId = response.data.spaceId;
        
        const responseDelete = await axios.delete(`${BACKEND_URL}/space/${spaceId}`,{
            headers:{
                authorization: `Bearer ${userToken}`
            }
        })

        expect(responseDelete.status).toBe(200)
    })

    test('User is unable to delete if spaceId not found',async ()=>{
        const responseDelete = await axios.delete(`${BACKEND_URL}/space/123456`,null,{
            headers:{
                authorization: `Bearer ${userToken}`
            }
        })

        expect(responseDelete.status).toBe(404)
    })

    test('User is unable to delete space of another user',async ()=>{
        const response = await axios.post(`${BACKEND_URL}/space`,{
            "name": "Test",
            "dimensions": "100x200",
            mapId,
        },
        {
            headers:{
                authorization: `Bearer ${userToken}`
            }
        })

        const spaceId = response.data.spaceId;

        const responseDelete = await axios.delete(`${BACKEND_URL}/space/${spaceId}`,
            null,
            {
            headers:{
                authorization: `Bearer ${adminToken}`
            }
        })

        expect(responseDelete.status).toBe(403)
    })

    test('User is unable to delete if unauthorized',async ()=>{
        const response = await axios.post(`${BACKEND_URL}/space`,{
            "name": "Test",
            "dimensions": "100x200",
            mapId,
        },
        {
            headers:{
                authorization: `Bearer ${token}`
            }
        })
        const spaceId = response.data.spaceId;
        
        const responseDelete = await axios.delete(`${BACKEND_URL}/space/${spaceId}`)

        expect(responseDelete.status).toBe(401)
    })

    // Get existing spaces
    test('Get existing spaces of a user', async ()=>{
        await axios.post(`${BACKEND_URL}/space`,{
            "name": "Test",
            "dimensions": "100x200",
            mapId,
        },
        {
            headers:{
                authorization: `Bearer ${userToken}`
            }
        })

        const response = await axios.get(`${BACKEND_URL}/space/all`,
            null,
        {
            headers:{
                authorization : `Bearer ${userToken}`
            }
        })

        expect(response.status).toBe(200);
        expect(response.data.spaces.length).toBe(1);

    })
  
    test('No spaces if unauthorized', async ()=>{
        const response = await axios.get(`${BACKEND_URL}/space/all`)

        expect(response.status).toBe(401);
    })
})

// Arena 
describe('Arena',()=>{
    let adminToken;
    let mapId;
    let elementId1;
    let elementId2;
    let userToken;
    let spaceId;

    beforeAll(async ()=>{
        // Create Admin
        const adminName = 'abhay' + Date.now()
        const adminPassword = '12345' + Date.now()

        await registerUser(adminName,adminPassword,'user')
        const {data:d1} = await loginUser(adminName,adminPassword) 
        
        adminToken = d1.token
        
        // Create Elements
        const createElementResponse1 = await axios.post(`${BACKEND_URL}/admin/element`,{
            "imageUrl": "https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcRCRca3wAR4zjPPTzeIY9rSwbbqB6bB2hVkoTXN4eerXOIkJTG1GpZ9ZqSGYafQPToWy_JTcmV5RHXsAsWQC3tKnMlH_CsibsSZ5oJtbakq&usqp=CAE",
            "width": 1,
            "height": 1,
            "static": true ,
        },
        {
            headers:{
                authorization: `Bearer ${adminToken}`
            }
        })
        elementId1 = createElementResponse1.data.id

        const createElementResponse2 = await axios.post(`${BACKEND_URL}/admin/element`,{
            "imageUrl": "https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcRCRca3wAR4zjPPTzeIY9rSwbbqB6bB2hVkoTXN4eerXOIkJTG1GpZ9ZqSGYafQPToWy_JTcmV5RHXsAsWQC3tKnMlH_CsibsSZ5oJtbakq&usqp=CAE",
            "width": 2,
            "height": 2,
            "static": false,
        },
        {
            headers:{
                authorization: `Bearer ${adminToken}`
            }
        })
        elementId2 = createElementResponse2.data.id
        
        // Create Map
        const createMapResponse = await axios.post(`${BACKEND_URL}/admin/map`,{
            "thumbnail": "https://thumbnail.com/a.png",
            "dimensions": "100x200",
            "name": "100 person interview room",
            "defaultElements": [{
                elementId: elementId1,
                x: 20,
                y: 20
                }, 
                {
                elementId: elementId2,
                x: 18,
                y: 20
                }
            ],
        },
        {
            headers:{
                authorization: `Bearer ${adminToken}`
            }
        })
        mapId = createMapResponse.data.id

        // Create User
        const username = 'abhay' + Date.now()
        const password = '12345' + Date.now()

        await registerUser(username,password,'user')
        const {data} = await loginUser(username,password) 
        
        userToken = data.token

        // Create a space
        const createResponse = await axios.post(`${BACKEND_URL}`,{
            "name": "Test",
            "dimensions": "100x200",
            mapId,
        },
        {
            headers: {
                authorization: `Bearer ${userToken}`
            }
        })
        spaceId = createResponse.data.spaceId;
    })

    // Get Space
    test('Get a space', async ()=>{
        const response = await axios.get(`${BACKEND_URL}/space/${spaceId}`,
            null,
            {
            headers:{
                authorization: `Bearer ${userToken}`
            }
        })

        expect(response.status).toBe(200)
        expect(response.data.dimensions).toBe("100x200")
        expect(response.data.elements.length).toBe(2)
    })

    test('Cannot get a space if unauthorized', async ()=>{
        const response = await axios.get(`${BACKEND_URL}/space/${spaceId}`)

        expect(response.status).toBe(401)
    })

    test('Cannot get a space if space does not exists', async ()=>{
        const response = await axios.get(`${BACKEND_URL}/space/xyz123`,
            null,
            {
            headers:{
                authorization: `Bearer ${userToken}`
            }
        })

        expect(response.status).toBe(404)
    })

    // Add elements
    test('Add an Element to the space', async ()=>{
        const response = await axios.post(`${BACKEND_URL}/space/element`,{
            elementId:elementId1,
            spaceId,
            "x": 50,
            "y": 20,
        },
        {
            headers:{
                authorization: `Bearer ${userToken}`
            }
        })
        expect(response.status).toBe(200)
    })

    test('Can not add Element if element is outside dimensions', async ()=>{
        const response = await axios.post(`${BACKEND_URL}/space/element`,{
            elementId:elementId1,
            spaceId,
            "x": 50000,
            "y": 20000,
        },
        {
            headers:{
                authorization: `Bearer ${userToken}`
            }
        })
        expect(response.status).toBe(400)
    })

    test('Can not add Element if element does not exists', async ()=>{
        const response = await axios.post(`${BACKEND_URL}/space/element`,{
            elementId:'12345',
            spaceId,
            "x": 50,
            "y": 20,
        },
        {
            headers:{
                authorization: `Bearer ${userToken}`
            }
        })
        expect(response.status).toBe(400)
    })

    test('Can not add Element if spaceId does not exists', async ()=>{
        const response = await axios.post(`${BACKEND_URL}/space/element`,{
            elementId:elementId1,
            "x": 50,
            "y": 20,
        },
        {
            headers:{
                authorization: `Bearer ${userToken}`
            }
        })
        expect(response.status).toBe(400)
    })

    test('Can not add Element if unauthorized', async ()=>{
        const response = await axios.post(`${BACKEND_URL}/space/element`,{
            elementId,
            spaceId,
            "x": 50,
            "y": 20,
        })
        expect(response.status).toBe(401)
    })

    // Delete elements
    test('Remove an element from the space', async ()=>{
        const response = await axios.get(`${BACKEND_URL}/space/${spaceId}`,null ,{
            headers:{
                authorization: `Bearer ${userToken}`
            }
        })

        const deleteResponse = await axios.delete(`${BACKEND_URL}/space/element`,{
            id: response.data.elements[0].id,
            spaceId
        },{
            headers:{
                authorization: `Bearer ${userToken}`
            }
        })

        expect(deleteResponse.status).toBe(200)
    })
    
    test('Cannot remove an element if unauthoized', async ()=>{
        const response = await axios.get(`${BACKEND_URL}/space/${spaceId}`,null ,{
            headers:{
                authorization: `Bearer ${userToken}`
            }
        })

        const deleteResponse = await axios.delete(`${BACKEND_URL}/space/element`,{
            id: response.data.elements[0].id,
            spaceId
        })

        expect(deleteResponse.status).toBe(401)
    })

    test('Cannot remove an element if wrong element Id', async ()=>{
        const response = await axios.get(`${BACKEND_URL}/space/${spaceId}`,null ,{
            headers:{
                authorization: `Bearer ${userToken}`
            }
        })

        const deleteResponse = await axios.delete(`${BACKEND_URL}/space/element`,{
            id: 'xyz123',
            spaceId
        },{
            headers:{
                authorization: `Bearer ${userToken}`
            }
        })
        
        expect(deleteResponse.status).toBe(404)
    })
    
    test('Cannot remove an element if wrong space Id', async ()=>{
        const response = await axios.get(`${BACKEND_URL}/space/${spaceId}`,null ,{
            headers:{
                authorization: `Bearer ${userToken}`
            }
        })

        const deleteResponse = await axios.delete(`${BACKEND_URL}/space/element`,{
            id: response.data.elements[0],
            spaceId: 'xyz123'
        },{
            headers:{
                authorization: `Bearer ${userToken}`
            }
        })
        
        expect(deleteResponse.status).toBe(401)
    })
    
    // See All available elements
    test('Get all available elements',async()=>{
        const response = await axios.get(`${BACKEND_URL}/elements`)

        expect(response.status).toBe(200)
        expect(response.data.elements.length).toBe(2)
    })

})

// Admin
describe('Admin Create endpoints',()=>{
    let adminToken;
    let userToken;

    beforeAll(async ()=>{
        // Create Admin
        const adminName = 'abhay' + Date.now()
        const adminPassword = '12345' + Date.now()

        await registerUser(adminName,adminPassword,'admin')
        const {data:d1} = await loginUser(adminName,adminPassword)

        adminToken = d1.token
        
        // Create User
        const username = 'abhay' + Date.now()
        const password = '12345' + Date.now()

        await registerUser(username,password,'admin')
        const {data} = await loginUser(username,password)

        userToken = data.token
    })

    // Create Elements
    test('Admin can Create an element', async ()=>{
        const response = await axios.post(`${BACKEND_URL}/admin/element`,
        {
            "imageUrl": "https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcRCRca3wAR4zjPPTzeIY9rSwbbqB6bB2hVkoTXN4eerXOIkJTG1GpZ9ZqSGYafQPToWy_JTcmV5RHXsAsWQC3tKnMlH_CsibsSZ5oJtbakq&usqp=CAE",
            "width": 1,
            "height": 1,
            "static": true ,
        },{
            headers :{
                authorization: `Bearer ${adminToken}`
            }
        })
        expect(response.status).toBe(200)
        expect(response.data.id).toBeDefined()
    })
  
    test('Data is required while Creating elements', async ()=>{
        const response = await axios.post(`${BACKEND_URL}/admin/element`,
            null
            ,{
            headers :{
                authorization: `Bearer ${adminToken}`
            }
        })
        expect(response.status).toBe(400)
    })

    // Update Elements
    test('Admin can update an element', async ()=>{
        const createResponse = await axios.post(`${BACKEND_URL}/admin/element`,
            {
                "imageUrl": "https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcRCRca3wAR4zjPPTzeIY9rSwbbqB6bB2hVkoTXN4eerXOIkJTG1GpZ9ZqSGYafQPToWy_JTcmV5RHXsAsWQC3tKnMlH_CsibsSZ5oJtbakq&usqp=CAE",
                "width": 1,
                "height": 1,
                "static": true ,
            },{
                headers :{
                    authorization: `Bearer ${adminToken}`
                }
            })
        const elementId = createResponse.data.id

        const response = await axios.put(`${BACKEND_URL}/admin/element/${elementId}`,
        {
            "imageUrl": "https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcRCRca3wAR4zjPPTzeIY9rSwbbqB6bB2hVkoTXN4eerXOIkJTG1GpZ9ZqSGYafQPToWy_JTcmV5RHXsAsWQC3tKnMlH_CsibsSZ5oJtbakq&usqp=CAE",
        },
        {
            headers :{
                authorization: `Bearer ${adminToken}`
            }
        })
        expect(response.status).toBe(200)
    })

    test('Cannot update if elementId doesnot exists', async ()=>{
        const response = await axios.put(`${BACKEND_URL}/admin/element/xyz1234`,
        {
            "imageUrl": "https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcRCRca3wAR4zjPPTzeIY9rSwbbqB6bB2hVkoTXN4eerXOIkJTG1GpZ9ZqSGYafQPToWy_JTcmV5RHXsAsWQC3tKnMlH_CsibsSZ5oJtbakq&usqp=CAE",
        },
        {
            headers :{
                authorization: `Bearer ${adminToken}`
            }
        })
        expect(response.status).toBe(404)
    })

    // Create Avatar
    test('Admin can Create an avatar', async ()=>{
        const response = await axios.post(`${BACKEND_URL}/admin/avatar`,
        {
            "imageUrl": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQm3RFDZM21teuCMFYx_AROjt-AzUwDBROFww&s",
            "name": "Timmy"
        },
        {
            headers :{
                authorization: `Bearer ${adminToken}`
            }
        })
        expect(response.status).toBe(200)
        expect(response.data.avatarId).toBeDefined()
    })
  
    test('Data is required while Creating avatars', async ()=>{
        const response = await axios.post(`${BACKEND_URL}/admin/avatar`,
            null
            ,{
            headers :{
                authorization: `Bearer ${adminToken}`
            }
        })
        expect(response.status).toBe(400)
    })
    
    // Create Maps
    test('Admin can Create maps', async ()=>{
        const response = await axios.post(`${BACKEND_URL}/admin/map`,
            {
                "thumbnail": "https://thumbnail.com/a.png",
                "dimensions": "100x200",
                "name": "100 person interview room",
                "defaultElements": []
            },
            {
            headers :{
                authorization: `Bearer ${adminToken}`
            }
        })
        expect(response.status).toBe(200)
        expect(response.data.id).toBeDefined()
    })
  
    test('Data is required while Creating avatars', async ()=>{
        const response = await axios.post(`${BACKEND_URL}/admin/map`,
            null
            ,{
            headers :{
                authorization: `Bearer ${adminToken}`
            }
        })
        expect(response.status).toBe(400)
    })

    // User cannot create elements,maps,avatars
    test('User cannot Create an element', async ()=>{
        const createElementResponse = await axios.post(`${BACKEND_URL}/admin/element`,
        {
            "imageUrl": "https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcRCRca3wAR4zjPPTzeIY9rSwbbqB6bB2hVkoTXN4eerXOIkJTG1GpZ9ZqSGYafQPToWy_JTcmV5RHXsAsWQC3tKnMlH_CsibsSZ5oJtbakq&usqp=CAE",
            "width": 1,
            "height": 1,
            "static": true ,
        },
        {
            headers :{
                authorization: `Bearer ${userToken}`
            }
        })

        const updateElementResponse = await axios.put(`${BACKEND_URL}/admin/element/123`,
            {
                "imageUrl": "https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcRCRca3wAR4zjPPTzeIY9rSwbbqB6bB2hVkoTXN4eerXOIkJTG1GpZ9ZqSGYafQPToWy_JTcmV5RHXsAsWQC3tKnMlH_CsibsSZ5oJtbakq&usqp=CAE",
            },
            {
                headers :{
                    authorization: `Bearer ${userToken}`
                }
        })

        const createAvatarResponse = await axios.post(`${BACKEND_URL}/admin/avatar`,
            {
                "imageUrl": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQm3RFDZM21teuCMFYx_AROjt-AzUwDBROFww&s",
                "name": "Timmy"
            },
            {
                headers :{
                    authorization: `Bearer ${userToken}`
                }
            })

        const createMapResponse = await axios.post(`${BACKEND_URL}/admin/map`,
            {
                "thumbnail": "https://thumbnail.com/a.png",
                "dimensions": "100x200",
                "name": "100 person interview room",
                "defaultElements": [{
                        elementId: "chair1",
                        x: 20,
                        y: 20
                    }, {
                      elementId: "chair2",
                        x: 18,
                        y: 20
                    }, {
                      elementId: "table1",
                        x: 19,
                        y: 20
                    }, {
                      elementId: "table2",
                        x: 19,
                        y: 20
                    }
                ]
             },
            {
                headers :{
                    authorization: `Bearer ${userToken}`
                    }
            })
        expect(createElementResponse.status).toBe(403)
        expect(updateElementResponse.status).toBe(403)
        expect(createAvatarResponse.status).toBe(403)
        expect(createMapResponse.status).toBe(403)
    })

})

// ******************************************
// WEBSOCKET TESTS
// ******************************************

describe('Tests for websocket',()=>{
    let adminId 
    let userId  
    let adminToken  
    let userToken  
    let spaceId
    let adminWsClient
    let userWsClient
    let adminMsg = []
    let userMsg = []
    let adminX
    let adminY
    let userX
    let userY

    const getWsResponse = (arr) =>{
        let data = arr.shift()

        if(data){
            return data
        }
        else{
            return new Promise((resolve)=>{
                let interval = setInterval(()=>{
                    let data = arr.shift()
                    if(data){
                        clearInterval(interval)
                        resolve(data)
                    }
                },100)
            })
        }
    }


    beforeAll( async ()=>{
        // Creating 2 users
        const adminName = 'abhay' + Date.now()
        const adminPass = '12345' + Date.now()
        const username = 'abhay' + Date.now()
        const password = '12345' + Date.now()
        
        const response1 = await registerUser(adminName,adminPass,'admin')
        const response2 = await registerUser(username,password,'user')

        adminId = response1.data.id
        userId = response2.data.id
   
        const user1 = await loginUser(adminName,adminPass)
        const user2 = await loginUser(username,password)

        adminToken = user1.data.token
        userToken = user2.data.token

        // Creating an empty space (without map)
        const spaceResponse = await axios.post(`${BACKEND_URL}/space`,{
            "name": "Test",
            "dimensions": "100x200",
           },
           {
            headers:{
                authorization: `Bearer ${adminToken}`
            }
        })

        spaceId = spaceResponse.data.spaceId
    
        // Making 2 websocket connections
        adminWsClient = new WebSocket(WS_URL)
        userWsClient = new WebSocket(WS_URL)

        await new Promise((r)=>{ adminWsClient.onopen = r})
        adminWsClient.onmessage((message)=>{
            adminMsg.push(JSON.parse(message))
        })
        
        await new Promise((r)=>{ userWsClient.onopen = r})
        userWsClient.onmessage((message)=>{
            userMsg.push(JSON.parse(message))
        })
    })

    test('User1 and User2 Successfully joined a room and got acknowledgement' , async ()=>{
        // User1 joins
        const joinPayload1 = {
            "type": "join",
            "payload": {
                spaceId,
                "token": adminToken
            }
        }
        
        adminWsClient.send(JSON.stringify(joinPayload1))
       
        const response1 = await getWsResponse(adminMsg)
        adminX = response1.payload.spawn.x
        adminY = response1.payload.spawn.y 

        // User2 Joins
        const joinPayload2 = {
            "type": "join",
            "payload": {
                spaceId,
                "token": userToken
            }
        }
        
        adminWsClient.send(JSON.stringify(joinPayload2))
       
        const response2 = await getWsResponse(userMsg)
        userX = response2.payload.spawn.x
        userY = response2.payload.spawn.y 

        const response3 = await getWsResponse(adminMsg)
        
        expect(response1.type).toBe("space-joined")
        expect(response1.payload.users[0].id).toBe(adminId)

        expect(response2.type).toBe("space-joined")
        expect(response2.payload.users[1].id).toBe(userId)
        
        expect(response3.type).toBe("user-join")
        expect(response3.payload.userId).toBe(userId)
        expect(response3.payload.x).toBe(userX)
        expect(response3.payload.y).toBe(userY)
    })

    // test('Cannot join if space does not exist' , ()=>{
    //     const joinPayload = {
    //         "type": "join",
    //         "payload": {
    //             "spaceId": "123",
    //             "token": adminToken
    //         }
    //     }
    //     userWsClient.send(JSON.stringify(joinPayload))
        
    // })

    test('Able to move one block at a time and broadcasted to every user' , async ()=>{
        adminWsClient.send(JSON.stringify({
            "type": "move",
            "payload": {
                "x": adminX + 1,
                "y": adminY,
                "userId": adminId
            }
        }))

        const response = await getWsResponse(adminMsg)

        expect(response.type).toBe('movement')
        expect(response.payload.userId).toBe(adminId)
        expect(response.payload.x).toBe(adminX + 1)
        expect(response.payload.y).toBe(adminY)
    })
    
    test('Unable to move more than one block at a time' , async ()=>{
        adminWsClient.send(JSON.stringify({
            "type": "move",
            "payload": {
                "x": adminX + 2,
                "y": adminY,
                "userId": adminId
            }
        }))

        const response = await getWsResponse(adminMsg)

        expect(response.type).toBe('movement-rejected')
        expect(response.payload.x).toBe(adminX)
        expect(response.payload.y).toBe(adminY)
    })

    test('Successfully left a room' , async ()=>{
        adminWsClient.close()

        const response = await getWsResponse(adminMsg)

        expect(response.type).toBe('user-left')
        expect(response.payload.userId).toBe(adminId)
    })    
})

// test("Get back ack for joining the space", async () => {
// test("User should not be able to move across the boundary of the wall", async () => {
// test("User should not be able to move two blocks at the same time", async () => {
// test("Correct movement should be broadcasted to the other sockets in the room",async () => {
