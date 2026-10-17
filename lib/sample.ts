import type { Locker, LockerRecord } from "./locker";
const common = { website:"",reference:"",contactName:"",contactEmail:"",contactPhone:"",location:"Family records folder · study cabinet",notes:"This is an example. Replace it with your own account connection information.",status:"ready" as const,updatedAt:"2026-10-12T12:00:00.000Z" };
function item(id:string,title:string,category:LockerRecord["category"],organization:string,kind:LockerRecord["kind"]="account",review=false):LockerRecord { return {...common,id,title,category,organization,kind,status:review?"review":"ready"}; }
export const sampleLocker: Locker = {
  records:[
    item("sample-1","Term life insurance","insurance","Life insurance provider"),
    item("sample-2","Everyday checking","banking","Primary bank"),
    item("sample-3","Retirement account","investments","Retirement plan provider"),
    item("sample-4","Home mortgage","property","Mortgage servicer"),
    item("sample-5","Joint savings","banking","Savings provider"),
    item("sample-6","Brokerage account","investments","Investment provider"),
    item("sample-7","Last will & testament","legal","Estate planning attorney","document",true),
    item("sample-8","Healthcare directive","legal","Family records","document"),
  ],
  contacts:[{id:"sample-contact-1",name:"Alex Morgan",relationship:"Spouse",role:"First contact",email:"",phone:"",notes:"Example contact · no access granted."},{id:"sample-contact-2",name:"Jamie Chen",relationship:"Estate attorney",role:"Professional adviser",email:"",phone:"",notes:"Example contact · no access granted."}],
  message:"To my family: everything here is meant to make the practical things a little easier. Start with the people in my trusted circle. The original documents are in the study cabinet, in the folder marked ‘Family records’. Take your time, and ask for help when you need it.",reviewedAt:"2026-10-12T12:00:00.000Z"
};
