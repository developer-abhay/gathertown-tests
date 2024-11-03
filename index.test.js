const  axios = require("axios");

const BACKEND_URL = 'http://localhost:8000/api/v1'


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

    beforeAll(async ()=>{
        const username = 'abhay' + Date.now();
        const password = '12345' + Date.now();
        
        await registerUser(username,password,'admin')
        
        const {data} = await login(username,password)
        token = data.token

        const response = await axios.post(`${BACKEND_URL}/admin/avatar`,{
            "imageUrl": "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQm3RFDZM21teuCMFYx_AROjt-AzUwDBROFww&s",
            "name": "Timmy",
            headers:{
                "authorization": `Bearer ${token}`
            }
        })
        avatarId = response.data.avatarId;
    })

    test('User is able to update avatar', async ()=>{
        const respone = await axios.post(`${BACKEND_URL}/user/metadata`,{
            avatarId,
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
            avatarId:'',
            headers:{
                authorization: `Bearer ${token}`
            }
        })

        expect(response.status).toBe(400)
    })

    test('Retrieve all avatars', async ()=>{
        const response = await axios.get(`${BACKEND_URL}/avatars`)

        expect(response.status).toBe(200)
        expect(response.data.avatars[0].id).toBe(avatarId)
    })

})